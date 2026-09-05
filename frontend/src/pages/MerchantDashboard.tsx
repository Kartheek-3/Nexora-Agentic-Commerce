import { Link } from "react-router-dom";
import { ArrowUpRight, Send, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Metric } from "../components/ui/Metric";
import { Button } from "../components/ui/Button";
import { NexoraSurface } from "../components/ui/NexoraSurface";
import { getEventStreamUrl } from "../services/api";
import { fetchMerchantActivity, fetchMerchantAnalytics, type MerchantActivity, type MerchantAnalytics } from "../services/merchant";

const emptyMetrics: MerchantAnalytics = {
  mode: "real",
  ai_assisted_revenue: 0,
  verified_transactions: 0,
  all_verified_transactions: 0,
  agent_conversion_rate: null,
  conversion_rate: null,
  conversion_lift: null,
  baseline_conversion_rate: null,
  conversion_lift_label: "Insufficient baseline data",
  average_order_value: 0,
  upsell_revenue: 0,
  upsell_transactions: 0,
  upsell_revenue_label: "No attributed upsell purchases yet.",
  recovered_revenue: 0,
  recovered_transactions: 0,
  recovered_revenue_label: "No recovered transactions yet.",
  agent_sessions: 0,
  transactions: 0,
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function activityTime(event: MerchantActivity) {
  return new Date(event.created_at).toLocaleTimeString("en-IN", { hour12: false });
}

function mergeActivity(current: MerchantActivity[], incoming: MerchantActivity[]) {
  const byId = new Map<string, MerchantActivity>();
  [...incoming, ...current].forEach((event) => {
    const key = event.id || `${event.created_at}-${event.event_type}`;
    if (!byId.has(key)) byId.set(key, event);
  });
  return Array.from(byId.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);
}

function metadataNumber(event: MerchantActivity, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "number" ? value : null;
}

function activityCopy(event: MerchantActivity) {
  const candidateCount = metadataNumber(event, "candidate_count");
  const amountInr = metadataNumber(event, "amount_inr") ?? metadataNumber(event, "amount");
  const skuList = Array.isArray(event.metadata?.skus) ? event.metadata.skus.slice(0, 3).join(", ") : "";
  switch (event.event_type) {
    case "SESSION_STARTED":
      return "Customer agent session opened.";
    case "INTENT_RECEIVED":
      return "Customer submitted a commerce intent.";
    case "INTENT_PARSED":
      return "Agent converted the prompt into structured buying constraints.";
    case "CATALOG_SEARCHED":
      return `Live catalog searched${candidateCount === null ? "" : `: ${candidateCount} candidates found`}.`;
    case "PRODUCT_RECOMMENDED":
      return `Ranked recommendations returned${skuList ? `: ${skuList}` : ""}.`;
    case "CART_PREPARED":
      return `Cart prepared from trusted product data${amountInr === null ? "" : ` for INR ${amountInr.toLocaleString("en-IN")}`}.`;
    case "POLICY_CHECK_PASSED":
      return "Merchant guardrails approved the proposed action.";
    case "POLICY_CHECK_BLOCKED":
      return "Merchant guardrails blocked the proposed action.";
    case "USER_AUTHORIZATION_RECEIVED":
      return "Customer explicitly authorized checkout.";
    case "RAZORPAY_ORDER_CREATED":
      return "Razorpay test order was created.";
    case "PAYMENT_VERIFIED":
      return "Payment signature verified and persisted.";
    default:
      return event.description;
  }
}

function statusClass(status: string) {
  if (status === "FAILED" || status === "BLOCKED") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (status === "APPROVED" || status === "COMPLETED") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  return "border-gold/30 bg-gold/10 text-gold";
}

export default function MerchantDashboard({ focus }: { focus?: string }) {
  const [metrics, setMetrics] = useState<MerchantAnalytics>(emptyMetrics);
  const [liveActivity, setLiveActivity] = useState<MerchantActivity[]>([]);
  const [activityUnavailable, setActivityUnavailable] = useState(false);

  useEffect(() => {
    const refreshAnalytics = () => fetchMerchantAnalytics().then(setMetrics).catch(() => setMetrics(emptyMetrics));
    refreshAnalytics();
    fetchMerchantActivity().then((items) => setLiveActivity(mergeActivity([], items))).catch(() => setLiveActivity([]));
    const source = new EventSource(getEventStreamUrl());
    source.addEventListener("nexora.audit", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as MerchantActivity;
      setLiveActivity((items) => mergeActivity(items, [payload]));
      if (payload.event_type === "PAYMENT_VERIFIED") {
        refreshAnalytics();
      }
    });
    source.onerror = () => {
      setActivityUnavailable(true);
      source.close();
    };
    return () => source.close();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Merchant Command Center {focus ? `· ${focus}` : ""}</p>
      <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Revenue systems for agentic buyers.</h1>
      <div data-tour="merchant-dashboard" className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="AI-Assisted Revenue" value={inr.format(metrics.ai_assisted_revenue)} detail={`${metrics.verified_transactions} verified transactions`} />
        <Metric
          label="Agent Conversion"
          value={metrics.agent_conversion_rate === null ? "No data" : `${metrics.agent_conversion_rate}%`}
          detail={metrics.agent_conversion_rate === null ? "No completed agent sessions yet." : `${metrics.verified_transactions} purchases from ${metrics.agent_sessions} agent sessions`}
        />
        <Metric
          label="Conversion Lift"
          value={metrics.conversion_lift === null ? "Insufficient data" : `+${metrics.conversion_lift}%`}
          detail={metrics.conversion_lift === null ? "Baseline conversion data is not available yet." : metrics.conversion_lift_label || "Compared with standard checkout"}
        />
        <Metric label="Upsell Revenue" value={inr.format(metrics.upsell_revenue)} detail={metrics.upsell_transactions ? `${metrics.upsell_transactions} accepted recommendations` : metrics.upsell_revenue_label || "No attributed upsell purchases yet."} />
        <Metric label="Recovered Revenue" value={inr.format(metrics.recovered_revenue)} detail={metrics.recovered_transactions ? `${metrics.recovered_transactions} recovered transactions` : metrics.recovered_revenue_label || "No recovered transactions yet."} />
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_420px]">
        <NexoraSurface data-tour="live-activity" intensity="raised" className="p-5">
          <h2 className="text-xl font-semibold">Live Agent Activity</h2>
          <div className="mt-5 space-y-3">
            {activityUnavailable ? <p className="rounded-md border border-line bg-black/25 p-3 text-sm text-ivory/[0.62]">Live updates unavailable. Showing persisted audit history.</p> : null}
            {liveActivity.length === 0 ? <p className="rounded-md border border-line bg-black/25 p-3 text-sm text-ivory/[0.62]">No recorded agent activity yet.</p> : null}
            {liveActivity.map((event, index) => (
              <motion.div key={event.id || `${event.created_at}-${event.event_type}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="grid gap-3 rounded-md border border-line bg-black/25 p-3 md:grid-cols-[84px_1fr]">
                <span className="font-mono text-sm text-ivory/[0.42]">{activityTime(event)}</span>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ember">{event.event_type}</span>
                    <span className="rounded border border-line px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-ivory/[0.58]">{event.actor_type || "system"}</span>
                    <span className={`rounded border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] ${statusClass(event.status)}`}>{event.status}</span>
                  </span>
                  <span className="mt-1 block text-sm text-ivory/[0.62]">{activityCopy(event)}</span>
                  {(event.agent_session_id || event.metadata?.session_id) ? <span className="mt-1 block font-mono text-[11px] text-ivory/[0.36]">session {String(event.agent_session_id || event.metadata?.session_id)}</span> : null}
                </span>
              </motion.div>
            ))}
          </div>
        </NexoraSurface>
        <section className="space-y-4">
          {[
            ["REVENUE OPPORTUNITY", "Catalog recommendation", "Pair compatible accessories when checkout history is still below the behavior threshold.", "Potential +INR 699 cart value"],
            ["CART RECOVERY", "No recovered carts yet", "Recovered revenue will appear after an abandoned cart is linked to a verified payment.", "INR 0 recovered"],
          ].map(([kicker, title, copy, impact]) => (
            <NexoraSurface key={title} intensity="command" className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-gold">{kicker}</p>
              <h3 className="mt-2 text-xl font-semibold">{title}</h3>
              <div className="my-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ivory/[0.42]">
                <span className="h-2 w-2 rounded-full bg-gold" />
                <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
                <span>{metrics.transactions >= 20 ? "Behavior signal" : "Catalog signal"}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
                <span className="h-2 w-2 rounded-full bg-ember" />
              </div>
              <p className="mt-3 text-sm leading-6 text-ivory/[0.62]">{copy}</p>
              <p className="mt-3 font-semibold text-ember">{impact}</p>
              <div className="mt-4 flex gap-2"><Link to="/merchant/audit"><Button variant="secondary" icon={<ArrowUpRight size={15} />}>Inspect</Button></Link><Link to="/merchant/campaigns"><Button icon={<Send size={15} />}>Approve Strategy</Button></Link></div>
            </NexoraSurface>
          ))}
          <Link data-tour="guardrails-link" to="/merchant/guardrails"><Button variant="secondary" icon={<ShieldCheck size={16} />}>Review Guardrails</Button></Link>
        </section>
      </div>
    </div>
  );
}
