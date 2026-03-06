import api from "./api";

export const subscriptionService = {
  getBillingStatus: () => api.get("/subscription/status").then((r) => r.data),
  createCheckoutSession: () =>
    api.post("/subscription/create-checkout-session").then((r) => {
      const data = r.data;
      if (!data?.url && data?.success) throw new Error("No checkout URL received");
      return data;
    }),
  createPortalSession: () =>
    api.post("/subscription/create-portal-session").then((r) => {
      const data = r.data;
      if (!data?.url && data?.success) throw new Error("No portal URL received");
      return data;
    }),
};
