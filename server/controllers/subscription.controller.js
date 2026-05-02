const User = require("../models/User");

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim() === "") return null;
  const stripe = require("stripe");
  return stripe(key);
}

function isBillingConfigured() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID_PRO?.trim();
  return !!(key && priceId);
}

const PRO_STATUSES = new Set(["active", "trialing"]);

const formatPricePayload = (price) => {
  if (!price) return null;
  return {
    id: price.id,
    currency: price.currency || "usd",
    unitAmount: Number.isFinite(price.unit_amount) ? price.unit_amount : null,
    interval: price.recurring?.interval || null,
    intervalCount: price.recurring?.interval_count || 1,
    nickname: price.nickname || null,
  };
};

const formatSubscriptionPayload = (subscription) => {
  if (!subscription) return null;
  const item = subscription.items?.data?.[0];
  return {
    id: subscription.id,
    status: subscription.status || "unknown",
    interval: item?.price?.recurring?.interval || null,
    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
  };
};

const getLiveStripeSubscription = async ({ stripeClient, user }) => {
  if (!stripeClient || !user) return null;

  if (user.stripeSubscriptionId) {
    try {
      return await stripeClient.subscriptions.retrieve(user.stripeSubscriptionId);
    } catch {
      void 0;
    }
  }

  if (user.stripeCustomerId) {
    try {
      const result = await stripeClient.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 3,
      });
      return result?.data?.[0] || null;
    } catch {
      void 0;
    }
  }

  return null;
};

const getConfiguredProPrice = async ({ stripeClient, liveSubscription }) => {
  if (!stripeClient) return null;

  const livePriceId = liveSubscription?.items?.data?.[0]?.price?.id;
  if (livePriceId) {
    try {
      const livePrice = await stripeClient.prices.retrieve(livePriceId);
      if (livePrice) return livePrice;
    } catch {
      void 0;
    }
  }

  const configuredPriceId = process.env.STRIPE_PRICE_ID_PRO?.trim();
  if (!configuredPriceId) return null;

  try {
    return await stripeClient.prices.retrieve(configuredPriceId);
  } catch {
    return null;
  }
};

const syncUserTierFromSubscription = async ({ user, subscription }) => {
  if (!user) return user;
  if (!subscription) {
    if (user.subscriptionTier !== "free" && !user.stripeSubscriptionId) {
      user.subscriptionTier = "free";
      user.subscriptionStatus = null;
      user.subscriptionExpiryDate = null;
      await user.save();
    }
    return user;
  }

  user.stripeSubscriptionId = subscription.id || user.stripeSubscriptionId;
  user.subscriptionStatus = subscription.status || null;
  user.subscriptionExpiryDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
  
  const nextTier = PRO_STATUSES.has(subscription.status) ? "pro" : "free";
  if (user.subscriptionTier !== nextTier) user.subscriptionTier = nextTier;
  
  if (nextTier === "free" && !PRO_STATUSES.has(subscription.status)) {
    user.stripeSubscriptionId = subscription.id || null;
  }
  
  await user.save();
  return user;
};

// ─── @GET /api/subscription/status ─────────────────────
const getBillingStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const stripeClient = getStripe();
    const liveSubscription = await getLiveStripeSubscription({ stripeClient, user });
    const proPrice = await getConfiguredProPrice({ stripeClient, liveSubscription });
    const updatedUser = await syncUserTierFromSubscription({ user, subscription: liveSubscription });
  const hasKey = !!(process.env.STRIPE_SECRET_KEY?.trim());
  const hasPriceId = !!(process.env.STRIPE_PRICE_ID_PRO?.trim());
  const configured = hasKey && hasPriceId;
  res.status(200).json({
    billingConfigured: configured,
    hint: configured ? null : "Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO to server/.env (not client/.env), then restart the server.",
    envCheck: {
      STRIPE_SECRET_KEY: hasKey ? "set" : "missing",
      STRIPE_PRICE_ID_PRO: hasPriceId ? "set" : "missing",
    },
    account: updatedUser ? {
      subscriptionTier: updatedUser.subscriptionTier,
      stripeCustomerId: updatedUser.stripeCustomerId || null,
      stripeSubscriptionId: updatedUser.stripeSubscriptionId || null,
    } : null,
    proPrice: formatPricePayload(proPrice),
    subscription: formatSubscriptionPayload(liveSubscription),
  });
  } catch (err) {
    next(err);
  }
};

const applyCheckoutSessionToUser = async ({ user, session, stripeClient }) => {
  if (!user || !session) return user;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  let subscriptionStatus = session.payment_status === "paid" ? "active" : null;

  if (subId && stripeClient) {
    try {
      const subscription = await stripeClient.subscriptions.retrieve(subId);
      subscriptionStatus = subscription?.status || subscriptionStatus;
    } catch {
      void 0;
    }
  }

  if (customerId) user.stripeCustomerId = customerId;
  if (subId) user.stripeSubscriptionId = subId;

  if (["active", "trialing", "paid"].includes(subscriptionStatus)) {
    user.subscriptionTier = "pro";
  } else if (subscriptionStatus) {
    user.subscriptionTier = "free";
  }

  await user.save();
  return user;
};

// ─── @POST /api/subscription/create-checkout-session ───
const createCheckoutSession = async (req, res, next) => {
  try {
    const user = req.user;
    const priceId = process.env.STRIPE_PRICE_ID_PRO?.trim();
    const stripeClient = getStripe();

    if (!priceId || !stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Billing is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO to server .env",
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const successUrl = `${clientUrl}/dashboard?nav=dashboard&billing=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${clientUrl}/subscription?canceled=true`;

    const trialDays = process.env.STRIPE_TRIAL_DAYS ? parseInt(process.env.STRIPE_TRIAL_DAYS, 10) : 0;
    const sessionConfig = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user._id.toString(),
      ...(trialDays > 0 && {
        subscription_data: { trial_period_days: trialDays },
      }),
      allow_promotion_codes: true,
    };

    if (user.stripeCustomerId) {
      sessionConfig.customer = user.stripeCustomerId;
    } else {
      sessionConfig.customer_email = user.email;
    }

    const session = await stripeClient.checkout.sessions.create(sessionConfig);

    if (!session.url) {
      return res.status(502).json({
        success: false,
        message: "Stripe did not return a checkout URL. Try again.",
      });
    }

    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    const msg = err.message || err.raw?.message || "Checkout failed";
    const code = err.code || err.type;
    if (code && (String(code).startsWith("stripe_") || String(err.type).startsWith("Stripe"))) {
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

const syncCheckoutSession = async (req, res, next) => {
  try {
    const stripeClient = getStripe();
    const sessionId = req.body?.sessionId?.trim?.();
    const user = req.user;

    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Billing is not configured. Add STRIPE_SECRET_KEY to server .env",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe checkout session ID is required.",
      });
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Stripe checkout session was not found.",
      });
    }

    const sessionUserId = session.client_reference_id;
    if (sessionUserId && String(sessionUserId) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "This checkout session does not belong to the current user.",
      });
    }

    const updatedUser = await applyCheckoutSessionToUser({ user, session, stripeClient });

    res.status(200).json({
      success: true,
      user: updatedUser,
      subscriptionTier: updatedUser.subscriptionTier,
    });
  } catch (err) {
    const msg = err.message || err.raw?.message || "Could not verify checkout session";
    const code = err.code || err.type;
    if (code && (String(code).startsWith("stripe_") || String(err.type).startsWith("Stripe"))) {
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

// ─── @POST /api/subscription/create-portal-session ─────
const createPortalSession = async (req, res, next) => {
  try {
    const user = req.user;
    const stripeClient = getStripe();

    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Billing is not configured. Add STRIPE_SECRET_KEY to server .env",
      });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId && user.email) {
      const existingCustomers = await stripeClient.customers.list({ email: user.email, limit: 1 });
      const matchedCustomer = existingCustomers?.data?.[0];
      if (matchedCustomer?.id) {
        customerId = matchedCustomer.id;
        await User.updateOne({ _id: user._id }, { stripeCustomerId: customerId });
      }
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "No billing account found yet. Start a subscription first.",
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const returnUrl = `${clientUrl}/dashboard?nav=dashboard&billing=portal`;

    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      return res.status(502).json({
        success: false,
        message: "Could not open billing portal. Configure it in Stripe Dashboard → Billing → Customer portal.",
      });
    }

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (err) {
    const msg = err.message || err.raw?.message || "Portal failed";
    const code = err.code || err.type;
    if (code && (String(code).startsWith("stripe_") || String(err.type).startsWith("Stripe"))) {
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

// ─── @POST /api/subscription/webhook ───────────────────
// Raw body required for signature verification; register in app.js with express.raw()
const handleWebhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeClient = getStripe();

  if (!webhookSecret || !stripeClient) {
    return res.status(503).send("Webhook not configured");
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (!userId) break;
        const user = await User.findById(userId);
        if (!user) break;
        await applyCheckoutSessionToUser({ user, session, stripeClient });
        break;
      }
      case "customer.subscription.created": {
        const subscription = event.data.object;
        if (subscription.status !== "active" && subscription.status !== "trialing") break;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (!user) break;
        user.stripeSubscriptionId = subscription.id;
        user.subscriptionTier = "pro";
        user.subscriptionStatus = subscription.status;
        user.subscriptionExpiryDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
        await user.save();
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        if (!user) break;
        
        user.subscriptionStatus = subscription.status;
        user.subscriptionExpiryDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
        
        if (subscription.status === "active" || subscription.status === "trialing") {
          user.subscriptionTier = "pro";
        } else {
          user.subscriptionTier = "free";
          user.stripeSubscriptionId = null;
        }
        await user.save();
        break;
      }
      default:
        break;
    }
    res.status(200).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBillingStatus,
  createCheckoutSession,
  createPortalSession,
  syncCheckoutSession,
  handleWebhook,
};
