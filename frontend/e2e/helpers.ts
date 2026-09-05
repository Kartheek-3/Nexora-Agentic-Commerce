import { expect, type APIRequestContext } from "@playwright/test";

export const backendURL = process.env.E2E_BACKEND_URL || "http://127.0.0.1:5000";

export async function expectHealth(request: APIRequestContext) {
  const response = await request.get(`${backendURL}/api/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.data.service).toBe("nexora-api");
  return body;
}

export async function createDemoOrder(request: APIRequestContext, idempotencyKey: string, extra: Record<string, unknown> = {}) {
  const response = await request.post(`${backendURL}/api/checkout/create-order`, {
    data: {
      cart_id: "demo_cart_birthday",
      idempotency_key: idempotencyKey,
      ...extra,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.data.currency).toBe("INR");
  expect(body.data.key_id).toMatch(/^rzp_test_/);
  expect(body.data.amount).toBe(369800);
  expect(JSON.stringify(body).toLowerCase()).not.toContain("key_secret");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("webhook_secret");
  return body.data as {
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    idempotent_replay: boolean;
  };
}
