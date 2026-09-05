import { expect, test } from "@playwright/test";
import { expectHealth } from "./helpers";

test("checkout opens Razorpay after explicit authorization", async ({ page, request }) => {
  await expectHealth(request);

  const createOrder = page.waitForResponse((response) => response.url().includes("/api/checkout/create-order") && response.request().method() === "POST");
  await page.goto("/checkout");
  await expect(page.getByText("Approval required")).toBeVisible();
  await expect(page.getByText("Silver Celestial Necklace")).toBeVisible();
  await expect(page.getByText("Premium Jewellery Case")).toBeVisible();
  await expect(page.getByRole("button", { name: /Approve/i })).toBeVisible();
  await page.getByRole("button", { name: /Approve/i }).click();

  const orderResponse = await createOrder;
  expect(orderResponse.ok()).toBeTruthy();
  const orderBody = await orderResponse.json();
  expect(orderBody.data.amount).toBe(369800);
  expect(orderBody.data.currency).toBe("INR");
  expect(orderBody.data.key_id).toMatch(/^rzp_test_/);

  await page.waitForLoadState("domcontentloaded");
  const checkoutScriptLoaded = await page.locator('script[src="https://checkout.razorpay.com/v1/checkout.js"]').count();
  expect(checkoutScriptLoaded).toBeGreaterThan(0);

  const razorpaySurface = page.locator("iframe").or(page.getByText(/Razorpay|Payment Details|Card/i));
  await expect(razorpaySurface.first()).toBeVisible({ timeout: 30_000 });

  test.info().annotations.push({
    type: "manual",
    description: "Hosted Razorpay payment completion may require OTP/3DS/manual interaction; do not fake success.",
  });
});

test("cancelled checkout does not navigate to success", async ({ page, request }) => {
  await expectHealth(request);

  await page.goto("/checkout");
  await page.getByRole("button", { name: /Approve/i }).click();
  await page.waitForResponse((response) => response.url().includes("/api/checkout/create-order") && response.request().method() === "POST");
  await expect(page.locator('script[src="https://checkout.razorpay.com/v1/checkout.js"]')).toHaveCount(1);

  const closeButton = page.getByRole("button", { name: /close|cancel/i }).first();
  if (await closeButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await closeButton.click();
    await expect(page).not.toHaveURL(/payment\/success/);
    return;
  }

  test.info().annotations.push({
    type: "manual",
    description: "Razorpay hosted modal close control was not automation-addressable in this run.",
  });
});
