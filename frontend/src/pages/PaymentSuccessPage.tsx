import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { CommerceCore } from "../components/three/CommerceCore";
import { Button } from "../components/ui/Button";
import { formatINR } from "../lib/utils";

function readSuccessReceipt() {
  try {
    const raw = sessionStorage.getItem("nexora_payment_success");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { amount?: number; orderId?: string; paymentId?: string };
    return parsed.orderId || parsed.paymentId ? parsed : null;
  } catch {
    return null;
  }
}

export default function PaymentSuccessPage() {
  const receipt = readSuccessReceipt();
  if (!receipt) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:px-6">
        <div className="self-center">
          <CircleCheck className="text-ivory/30" size={38} />
          <h1 className="mt-5 text-4xl font-semibold">No verified checkout found.</h1>
          <p className="mt-4 text-ivory/[0.64]">Complete checkout from the authorization screen to view a verified payment receipt.</p>
          <div className="mt-8 flex gap-3">
            <Link to="/checkout"><Button>Return To Checkout</Button></Link>
            <Link to="/merchant/audit"><Button variant="secondary">Open Audit Trail</Button></Link>
          </div>
        </div>
        <CommerceCore compact variant="compact" showLabels={false} state="idle" />
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:px-6">
      <div className="self-center">
        <CircleCheck className="text-gold" size={38} />
        <h1 className="mt-5 text-4xl font-semibold">Transaction verified.</h1>
        <p className="mt-3 text-3xl font-semibold text-ember">{receipt.amount ? formatINR(receipt.amount) : "Payment verified"}</p>
        {receipt.orderId ? <p className="mt-3 font-mono text-sm text-ivory/[0.56]">Order {receipt.orderId}</p> : null}
        <p className="mt-4 text-ivory/[0.64]">Razorpay test signature verified server-side. The merchant order is created and every action is auditable.</p>
        <div className="mt-6 grid gap-2 text-sm text-ivory/[0.72]">
          {["Razorpay verification", "Order created", "Audit recorded"].map((item) => (
            <span key={item} className="rounded-md border border-line bg-white/5 px-3 py-2">{item} ✓</span>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <Link to="/merchant/audit"><Button>Open Audit Trail</Button></Link>
          <Link to="/merchant"><Button variant="secondary">Merchant Dashboard</Button></Link>
        </div>
      </div>
      <CommerceCore compact variant="compact" showLabels={false} state="success" />
    </div>
  );
}
