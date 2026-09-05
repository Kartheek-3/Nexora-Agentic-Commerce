import { ShieldCheck } from "lucide-react";
import type { CartItem } from "../../types/commerce";
import { formatINR } from "../../lib/utils";
import { Button } from "../ui/Button";
import { NexoraSurface } from "../ui/NexoraSurface";

export function AuthorizationPanel({
  items,
  budget,
  approveLabel,
  approveDisabled = false,
  onApprove,
  onCancel,
}: {
  items: CartItem[];
  budget: number;
  approveLabel?: string;
  approveDisabled?: boolean;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const overBudget = total > budget;
  const remaining = budget - total;
  return (
    <NexoraSurface intensity="command" className="p-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-gold" />
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Purchase Authorization</p>
          <h2 className="text-xl font-semibold text-ivory">{overBudget ? "Purchase blocked" : "Approval required"}</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-sm">
            <span className="text-ivory/[0.72]">{item.name}</span>
            <span className="font-semibold text-ivory">{formatINR(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-line pt-3">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-ember">{formatINR(total)}</span>
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-line bg-black/30 p-3">
          <dt className="text-ivory/[0.48]">Customer budget</dt>
          <dd className="mt-1 font-semibold">{formatINR(budget)}</dd>
        </div>
        <div className="rounded-md border border-line bg-black/30 p-3">
          <dt className="text-ivory/[0.48]">{overBudget ? "Over budget" : "Remaining"}</dt>
          <dd className={`mt-1 font-semibold ${overBudget ? "text-red-200" : ""}`}>{formatINR(Math.abs(remaining))}</dd>
        </div>
        <div className="rounded-md border border-line bg-black/30 p-3">
          <dt className="text-ivory/[0.48]">Risk</dt>
          <dd className={`mt-1 font-semibold ${overBudget ? "text-red-200" : "text-emerald-300"}`}>{overBudget ? "BLOCKED" : "LOW"}</dd>
        </div>
        <div className="rounded-md border border-line bg-black/30 p-3">
          <dt className="text-ivory/[0.48]">AI confidence</dt>
          <dd className="mt-1 font-semibold">96%</dd>
        </div>
      </dl>
      <div className="mt-5 grid grid-cols-4 items-center gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-ivory/[0.52]">
        {["Agent", "Policy", "You", "Razorpay"].map((step) => (
          <span key={step} className={step === "You" ? "rounded border border-gold/40 bg-gold/10 py-2 text-ember" : "rounded border border-line bg-black/25 py-2"}>
            {step}
          </span>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-ivory/[0.62]">
        {overBudget
          ? "This cart exceeds the customer's stated budget. Remove an item, choose a cheaper alternative, or adjust the budget before checkout can continue."
          : "The agent cannot create a payment order until you approve this bounded action."}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onApprove} disabled={approveDisabled || overBudget}>
          {approveLabel ?? `Approve ${formatINR(total)}`}
        </Button>
      </div>
    </NexoraSurface>
  );
}
