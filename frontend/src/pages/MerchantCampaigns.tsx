import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "../components/ui/Button";
import { NexoraSurface } from "../components/ui/NexoraSurface";

export default function MerchantCampaigns() {
  const [generated, setGenerated] = useState(false);
  const [approved, setApproved] = useState(false);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Campaign Orchestrator</p>
      <h1 className="mt-2 text-4xl font-semibold">Growth actions require approval.</h1>
      <NexoraSurface className="mt-8 p-5">
        <div className="mb-4 grid grid-cols-4 items-center gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory/[0.52]">
          {["Audience", "Message", "Approval", "Send"].map((step) => <span key={step} className="rounded border border-line bg-black/25 py-2">{step}</span>)}
        </div>
        <textarea className="input-premium min-h-28 w-full rounded-md p-3 text-sm" defaultValue="Create a cart recovery campaign for users who abandoned a cart containing gaming equipment in the last seven days." />
        <Button className="mt-4" onClick={() => setGenerated(true)}>Generate Campaign</Button>
      </NexoraSurface>
      {generated ? (
        <NexoraSurface intensity="command" className="mt-5 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-ivory/[0.42]">Audience</p><p className="mt-1 text-xl font-semibold">17 customers</p></div>
            <div><p className="text-ivory/[0.42]">Cart value</p><p className="mt-1 text-xl font-semibold">INR 43,820</p></div>
            <div><p className="text-ivory/[0.42]">Channel</p><p className="mt-1 text-xl font-semibold">Email demo</p></div>
            <div><p className="text-ivory/[0.42]">Recovery</p><p className="mt-1 text-xl font-semibold">INR 8k-12k</p></div>
          </div>
          <div className="mt-5 rounded-md border border-line bg-black/25 p-4 text-sm leading-6 text-ivory/70">
            Your gaming setup is still reserved. Complete your order today and keep the Orbit keyboard bundle offer active with a policy-safe accessory recommendation.
          </div>
          <div className="mt-5 flex gap-3">
            <Button variant="secondary" onClick={() => { setGenerated(false); setApproved(false); }}>Edit</Button>
            <Button icon={<Send size={16} />} onClick={() => setApproved(true)}>Approve & Send</Button>
          </div>
          {approved ? <p className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">Merchant approval recorded. Demo channel send completed and audit event created.</p> : null}
        </NexoraSurface>
      ) : null}
    </div>
  );
}
