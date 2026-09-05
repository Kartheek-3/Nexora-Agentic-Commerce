import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthorizationPanel } from "../components/checkout/AuthorizationPanel";
import { products } from "../data/demo";
import { authorizeCheckout, createCheckoutOrder, recordCheckoutFailure, verifyCheckoutPayment, type CheckoutOrder } from "../services/checkout";

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function checkoutErrorMessage(error: unknown) {
  const maybeResponse = error as { response?: { data?: { error?: { code?: string } } } };
  const code = maybeResponse.response?.data?.error?.code;
  if (code) {
    return `We couldn't prepare this secure checkout. Please try again. (${code})`;
  }
  if (error instanceof Error && error.message.toLowerCase().includes("timeout")) {
    return "Secure checkout is taking longer than expected. Please retry.";
  }
  if (error instanceof Error && !error.message.includes("status code")) {
    return error.message;
  }
  return "We couldn't prepare this secure checkout. Please try again.";
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const paymentCompletedRef = useRef(false);
  const navigationStartedRef = useRef(false);
  const items = products.filter((product) => ["NEC102", "JCA210"].includes(product.id)).map((product) => ({ ...product, quantity: 1 }));

  const navigateOnce = (path: "/payment/success" | "/payment/failure") => {
    if (navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    console.log("[checkout] navigation started:", path);
    window.location.assign(path);
  };

  const handleApprove = async () => {
    console.log("[checkout] button clicked");
    paymentCompletedRef.current = false;
    navigationStartedRef.current = false;
    setLoading(true);
    setMessage("Creating Razorpay test order...");
    let order: CheckoutOrder | null = null;
    try {
      setMessage("Recording checkout authorization...");
      const authorization = await authorizeCheckout("demo_cart_birthday", "demo_birthday_checkout");
      console.log("[checkout] creating order");
      setMessage("Creating Razorpay test order...");
      order = await createCheckoutOrder(authorization.cart_id, "demo_birthday_checkout", authorization.authorization_id);
      console.log("[checkout] order created", { orderId: order.order_id, amount: order.amount, currency: order.currency });
      const orderIdValid = order.order_id.startsWith("order_");
      const amountValid = order.amount === 369800;
      const currencyValid = order.currency === "INR";
      const testKey = order.key_id.startsWith("rzp_test_");
      console.log("[checkout] order id valid=", orderIdValid);
      console.log("[checkout] amount=", order.amount);
      console.log("[checkout] currency=", order.currency);
      console.log("[checkout] test key=", testKey);
      if (!orderIdValid || !amountValid || !currencyValid || !testKey) {
        throw new Error("Secure payment order is invalid. Please retry.");
      }
      console.log("[checkout] loading Razorpay");
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        console.log("[checkout] Razorpay SDK load failed");
        throw new Error("Secure payment window could not be loaded. Please retry.");
      }
      console.log("[checkout] Razorpay script loaded");
      setMessage("Razorpay Checkout is ready.");
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "NEXORA",
        description: "Birthday gift authorization",
        order_id: order.order_id,
        handler: async (response) => {
          paymentCompletedRef.current = true;
          console.log("[checkout] handler fired");
          try {
            console.log("[checkout] verify starting");
            const result = await verifyCheckoutPayment({ ...response, checkout_request_id: order?.checkout_request_id });
            if (!result.verified) throw new Error("Payment verification failed.");
            console.log("[checkout] verify result:", { verified: result.verified, status: result.status });
            console.log("[checkout] backend verification passed");
            sessionStorage.setItem("nexora_payment_success", JSON.stringify({
              amount: order?.amount_inr ?? order?.amount,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
            }));
            console.log("[checkout] redirecting to success");
            navigateOnce("/payment/success");
          } catch (error) {
            console.error("[checkout] payment verification failed", error instanceof Error ? error.message : "Unknown verification error");
            navigateOnce("/payment/failure");
          }
        },
        modal: {
          ondismiss: async () => {
            if (paymentCompletedRef.current) return;
            console.log("[checkout] Razorpay checkout dismissed");
            await recordCheckoutFailure(order?.order_id || "unknown", "checkout_cancelled");
            navigateOnce("/payment/failure");
          },
        },
        theme: { color: "#d6a84f" },
      });
      console.log("[checkout] Razorpay opened");
      console.log("[checkout] opening Razorpay");
      checkout.open();
    } catch (error) {
      if (order?.order_id) await recordCheckoutFailure(order.order_id, "checkout_error");
      setMessage(checkoutErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div data-tour="checkout-authorization">
        <AuthorizationPanel
          items={items}
          budget={4000}
          approveDisabled={loading}
          approveLabel={loading ? "Opening Payment..." : undefined}
          onCancel={() => navigate("/cart")}
          onApprove={handleApprove}
        />
      </div>
      {message ? <p className="mt-4 rounded-md border border-line bg-black/25 p-3 text-sm text-ivory/60">{loading ? "Please wait. " : ""}{message}</p> : null}
    </div>
  );
}
