import { useState } from "react";
import { guardrails } from "../data/demo";
import { formatINR } from "../lib/utils";
import { NexoraSurface } from "../components/ui/NexoraSurface";
import { Button } from "../components/ui/Button";
import { simulateGuardrail, type PolicySimulation } from "../services/merchant";

const toggles = [
  ["allowCartEditing", "Allow AI cart editing"],
  ["allowUpselling", "Allow AI upselling"],
  ["allowCrossSelling", "Allow AI cross-selling"],
  ["allowCampaignGeneration", "Allow automatic campaign generation"],
  ["allowCampaignSending", "Allow automatic campaign sending"],
  ["requirePaymentAuthorization", "Require payment authorization"],
] as const;

const numericControls = [
  { key: "maximumTransactionValue", label: "Maximum transaction value", min: 500, max: 25000, percent: false },
  { key: "maximumDiscountPercentage", label: "Maximum discount percentage", min: 0, max: 50, percent: true },
  { key: "maximumCampaignSpend", label: "Maximum campaign spend", min: 0, max: 100000, percent: false },
  { key: "maximumRecommendedCartValue", label: "Maximum recommended cart value", min: 500, max: 25000, percent: false },
] as const;

export default function MerchantGuardrails() {
  const [state, setState] = useState(guardrails);
  const [sandbox, setSandbox] = useState({ action_type: "request_checkout", amount: 3698, discount_percent: 0, category: "Jewellery" });
  const [decision, setDecision] = useState<PolicySimulation | null>(null);
  const [sandboxError, setSandboxError] = useState("");

  const runSandbox = async () => {
    setSandboxError("");
    const fallback = {
      passed: sandbox.amount <= state.maximumTransactionValue && sandbox.discount_percent <= state.maximumDiscountPercentage,
      risk_level: sandbox.amount > state.maximumTransactionValue ? "HIGH" as const : "LOW" as const,
      requires_approval: state.requirePaymentAuthorization,
      decision_summary: sandbox.amount <= state.maximumTransactionValue ? "Policy simulation passed." : "Policy simulation blocked the action.",
      violations: sandbox.amount > state.maximumTransactionValue ? ["Transaction amount exceeds merchant maximum."] : [],
      warnings: [],
    } satisfies PolicySimulation;
    try {
      setDecision(await simulateGuardrail(sandbox));
    } catch {
      setDecision(fallback);
      setSandboxError("Backend unavailable. Showing the same demo policy logic locally.");
    }
  };
  const describeFinding = (finding: string | { rule: string; actual: unknown; allowed: unknown }) =>
    typeof finding === "string" ? finding : `${finding.rule}: ${String(finding.actual)} vs ${String(finding.allowed)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Bounded Commerce</p>
      <h1 className="mt-2 text-4xl font-semibold">Merchant guardrails</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]">
        <NexoraSurface intensity="raised" className="p-5">
          <div className="mb-6 rounded-lg border border-gold/25 bg-gold/10 p-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-ember">
            Agent bounded by policy perimeter
          </div>
          {numericControls.map(({ key, label, min, max, percent }) => (
            <label key={key} className="mb-5 block">
              <span className="flex justify-between text-sm"><span>{label}</span><span className="text-ember">{percent ? `${state[key]}%` : formatINR(state[key])}</span></span>
              <input className="mt-3 w-full accent-gold" type="range" min={min} max={max} value={state[key]} onChange={(event) => setState({ ...state, [key]: Number(event.currentTarget.value) })} />
            </label>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            {toggles.map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-line bg-black/25 p-3 text-sm">
                <span>{label}</span>
                <input type="checkbox" checked={state[key]} onChange={(event) => setState({ ...state, [key]: event.currentTarget.checked })} />
              </label>
            ))}
          </div>
        </NexoraSurface>
        <NexoraSurface className="p-5">
          <p className="text-sm font-semibold text-gold">Allowed agent tools</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.allowedTools.map((tool) => <span key={tool} className="rounded border border-line bg-white/5 px-2 py-1 text-xs text-ivory/[0.62]">{tool}</span>)}
          </div>
          <p className="mt-6 text-sm leading-6 text-ivory/[0.62]">Sensitive actions follow PROPOSED, POLICY_CHECK, AWAITING_APPROVAL, APPROVED, EXECUTING and COMPLETED. Payment approval remains required.</p>
        </NexoraSurface>
      </div>
      <NexoraSurface intensity="raised" className="mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Agent Policy Sandbox</p>
            <h2 className="mt-2 text-2xl font-semibold">Simulate before execution</h2>
          </div>
          <Button onClick={runSandbox}>Run Simulation</Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="text-sm text-ivory/70">Action
            <select className="input-premium mt-2 w-full rounded-md p-3 text-ivory" value={sandbox.action_type} onChange={(event) => setSandbox({ ...sandbox, action_type: event.currentTarget.value })}>
              <option value="request_checkout">request_checkout</option>
              <option value="checkout">checkout</option>
              <option value="cross_sell">cross_sell</option>
              <option value="cart_edit">cart_edit</option>
            </select>
          </label>
          <label className="text-sm text-ivory/70">Amount
            <input className="input-premium mt-2 w-full rounded-md p-3 text-ivory" type="number" value={sandbox.amount} onChange={(event) => setSandbox({ ...sandbox, amount: Number(event.currentTarget.value) })} />
          </label>
          <label className="text-sm text-ivory/70">Discount %
            <input className="input-premium mt-2 w-full rounded-md p-3 text-ivory" type="number" value={sandbox.discount_percent} onChange={(event) => setSandbox({ ...sandbox, discount_percent: Number(event.currentTarget.value) })} />
          </label>
          <label className="text-sm text-ivory/70">Category
            <input className="input-premium mt-2 w-full rounded-md p-3 text-ivory" value={sandbox.category} onChange={(event) => setSandbox({ ...sandbox, category: event.currentTarget.value })} />
          </label>
        </div>
        {sandboxError ? <p className="mt-4 text-sm text-gold">{sandboxError}</p> : null}
        {decision ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-line bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.16em] text-ivory/40">Decision</p><p className={decision.passed ? "mt-2 text-xl font-semibold text-emerald-200" : "mt-2 text-xl font-semibold text-red-200"}>{decision.passed ? "Allowed" : "Blocked"}</p></div>
            <div className="rounded-md border border-line bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.16em] text-ivory/40">Risk</p><p className="mt-2 text-xl font-semibold text-ember">{decision.risk_level}</p></div>
            <div className="rounded-md border border-line bg-black/25 p-4"><p className="text-xs uppercase tracking-[0.16em] text-ivory/40">Reason</p><p className="mt-2 text-sm text-ivory/70">{[decision.decision_summary, ...decision.violations.map(describeFinding), ...decision.warnings.map(describeFinding)].join(" ")}</p></div>
          </div>
        ) : null}
      </NexoraSurface>
    </div>
  );
}
