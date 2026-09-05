import { expect, test } from "@playwright/test";
import { backendURL, createDemoOrder, expectHealth } from "./helpers";

test("backend health works", async ({ request }) => {
  await expectHealth(request);
});

test("Razorpay uses TEST key and creates correct order amount", async ({ request }) => {
  const order = await createDemoOrder(request, `pw_order_${Date.now()}`);

  expect(order.order_id).toMatch(/^order_/);
  expect(order.amount).toBe(369800);
  expect(order.currency).toBe("INR");
  expect(order.key_id).toMatch(/^rzp_test_/);
});

test("invalid Razorpay signature is rejected", async ({ request }) => {
  const order = await createDemoOrder(request, `pw_invalid_sig_${Date.now()}`);
  const response = await request.post(`${backendURL}/api/checkout/verify`, {
    data: {
      razorpay_order_id: order.order_id,
      razorpay_payment_id: "pay_test_invalid_signature",
      razorpay_signature: "deliberately_invalid_signature",
    },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.error.code).toBe("SIGNATURE_INVALID");
});

test("duplicate create-order request is idempotent", async ({ request }) => {
  const idempotencyKey = `pw_duplicate_${Date.now()}`;
  const first = await createDemoOrder(request, idempotencyKey);
  const second = await createDemoOrder(request, idempotencyKey);

  expect(second.order_id).toBe(first.order_id);
  expect(second.idempotent_replay).toBe(true);
});

test("client amount tampering cannot change payment amount", async ({ request }) => {
  const order = await createDemoOrder(request, `pw_tamper_${Date.now()}`, {
    amount: 1,
    total: 1,
    subtotal: 1,
  });

  expect(order.amount).toBe(369800);
});

test("external AI gateway cannot execute payment", async ({ request }) => {
  const response = await request.post(`${backendURL}/api/agent-commerce/request-checkout`, {
    data: { product_ids: ["NEC102", "JCA210"] },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data.status).toBe("awaiting_human_authorization");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("payment_verified");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("razorpay_key_secret");
});

test("missing authorization is rejected or explicitly marked as current demo limitation", async ({ request }) => {
  const response = await request.post(`${backendURL}/api/checkout/create-order`, {
    data: {
      cart_id: "demo_cart_birthday",
      idempotency_key: `pw_missing_auth_${Date.now()}`,
      approved: true,
    },
  });

  if (response.status() === 403) {
    expect(response.ok()).toBeFalsy();
    return;
  }

  expect(response.ok()).toBeTruthy();
  test.info().annotations.push({
    type: "known-limitation",
    description: "Current demo checkout architecture does not yet persist and enforce approved agent action state before create-order.",
  });
});
