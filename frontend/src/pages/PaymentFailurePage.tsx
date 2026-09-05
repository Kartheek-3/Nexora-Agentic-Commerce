import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { CommerceCore } from "../components/three/CommerceCore";
import { Button } from "../components/ui/Button";
import { failureEvents } from "../data/demo";

export default function PaymentFailurePage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:px-6">
      <div className="self-center">
        <AlertTriangle className="text-red-200" size={42} />
        <h1 className="mt-5 text-4xl font-semibold">Transaction interrupted.</h1>
        <p className="mt-4 text-ivory/[0.64]">We could not complete your payment. No money was captured, your cart is safe, and no duplicate order was created.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {failureEvents.map((event) => <span key={event} className="rounded border border-line bg-white/5 px-3 py-2 text-xs text-ivory/[0.62]">{event}</span>)}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/checkout"><Button>Retry Payment</Button></Link>
          <Link to="/agent"><Button variant="secondary">Return to Agent</Button></Link>
          <Link to="/cart"><Button variant="ghost">Change Cart</Button></Link>
        </div>
      </div>
      <CommerceCore compact variant="compact" showLabels={false} state="failure" />
    </div>
  );
}
