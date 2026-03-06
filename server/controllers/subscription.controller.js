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

// ─── @GET /api/subscription/status ─────────────────────
const getBillingStatus = (req, res) => {
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
  });
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
    const successUrl = `${clientUrl}/subscription?success=true`;
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

// ─── @POST /api/subscription/create-portal-session ─────
const createPortalSession = async (req, res, next) => {
  try {
    const user = req.user;
    const stripeClient = getStripe();

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: "No billing account found. Subscribe first.",
      });
    }

    if (!stripeClient) {
      return res.status(503).json({
        success: false,
        message: "Billing is not configured. Add STRIPE_SECRET_KEY to server .env",
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const returnUrl = `${clientUrl}/subscription`;

    const session = await stripeClient.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
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
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (customerId) user.stripeCustomerId = customerId;
        if (subId) user.stripeSubscriptionId = subId;
        user.subscriptionTier = "pro";
        await user.save();
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
        await user.save();
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        if (!user) break;
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
  handleWebhook,
};
