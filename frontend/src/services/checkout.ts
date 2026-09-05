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

export type CheckoutAuthorization = {
  authorization_id: string;
  status: "approved";
  cart_id: string;
  amount: number;
  currency: string;
  idempotent_replay?: boolean;
};

export async function authorizeCheckout(cartId: string, idempotencyKey: string) {
  console.log("[checkout] authorization request starting");
  const response = await api.post<{ data: CheckoutAuthorization }>("/checkout/authorize", { cart_id: cartId, idempotency_key: idempotencyKey });
  return response.data.data;
}

export async function createCheckoutOrder(cartId: string, idempotencyKey: string, agentActionId?: string) {
  const response = await api.post<{ data: CheckoutOrder }>("/checkout/create-order", { cart_id: cartId, idempotency_key: idempotencyKey, agent_action_id: agentActionId });
  return response.data.data;
}

export async function verifyCheckoutPayment(payload: { checkout_request_id?: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const response = await api.post<{ data: { verified: boolean; status?: string; payment: unknown } }>("/checkout/verify", payload);
  return response.data.data;
}

export async function recordCheckoutFailure(orderId: string, reason: string) {
  const response = await api.post("/checkout/failure", { razorpay_order_id: orderId, reason });
  return response.data;
}
