import { api } from "./api";

export type CheckoutOrder = {
  checkout_request_id: string;
  order_id: string;
  amount: number;
  amount_inr: number;
  currency: string;
  key_id: string;
  receipt?: string;
  idempotency_key: string;
  idempotent_replay: boolean;
};

export type CheckoutFunnel = {
  funnel_session_id: string;
  channel: "agent" | "direct";
};

export type CheckoutAuthorization = {
  authorization_id: string;
  status: "approved";
  cart_id: string;
  amount: number;
  currency: string;
  idempotent_replay?: boolean;
};

export async function startCheckoutFunnel(funnelKey: string, agentSessionId?: string | null) {
  const response = await api.post<{ data: CheckoutFunnel }>("/checkout/funnel/start", { funnel_key: funnelKey, agent_session_id: agentSessionId || undefined });
  return response.data.data;
}

export async function authorizeCheckout(cartId: string, idempotencyKey: string, agentSessionId?: string | null, funnelSessionId?: string | null) {
  console.log("[checkout] authorization request starting");
  const response = await api.post<{ data: CheckoutAuthorization }>("/checkout/authorize", { cart_id: cartId, idempotency_key: idempotencyKey, agent_session_id: agentSessionId || undefined, funnel_session_id: funnelSessionId || undefined });
  return response.data.data;
}

export async function createCheckoutOrder(cartId: string, idempotencyKey: string, agentActionId?: string, agentSessionId?: string | null, funnelSessionId?: string | null) {
  const response = await api.post<{ data: CheckoutOrder }>("/checkout/create-order", { cart_id: cartId, idempotency_key: idempotencyKey, agent_action_id: agentActionId, agent_session_id: agentSessionId || undefined, funnel_session_id: funnelSessionId || undefined });
  return response.data.data;
}

export async function verifyCheckoutPayment(payload: { checkout_request_id?: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const response = await api.post<{ data: { verified: boolean; status?: string; payment: unknown } }>("/checkout/verify", payload);
  return response.data.data;
}

export async function recordCheckoutFailure(orderId: string, reason: string, funnelSessionId?: string | null) {
  const response = await api.post("/checkout/failure", { razorpay_order_id: orderId, reason, funnel_session_id: funnelSessionId || undefined });
  return response.data;
}
