import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileSearch,
  Fingerprint,
  Gauge,
  LockKeyhole,
  MousePointer2,
  Radio,
  ShieldCheck,
  UserCheck,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../components/ui/Button";
import { NexoraBadge, NexoraSurface } from "../components/ui/NexoraSurface";
import { api } from "../services/api";

type NodeKey =
  | "buyer"
  | "frontend"
  | "auth"
  | "agent"
  | "catalog"
  | "guardrails"
  | "approval"
  | "razorpay"
  | "verification"
  | "audit";

type HealthStatus = {
  backend: "online" | "unknown";
  supabase: boolean;
  firebase: boolean;
  razorpay: boolean;
  qwen: boolean;
};

const nodes: Array<{
  key: NodeKey;
  title: string;
  actor: string;
  badge: string;
  icon: typeof Bot;
  description: string;
  details: string[];
}> = [
  {
    key: "buyer",
    title: "Customer / External AI Buyer",
    actor: "Customer / External Agent",
    badge: "Intent Source",
    icon: MousePointer2,
    description: "Natural-language shopping intent enters NEXORA.",
    details: ["Gaming accessories under INR 5,000", "Minimal jewellery under INR 4,000", "External buyers can prepare commerce, not spend money."],
  },
  {
    key: "frontend",
    title: "Frontend Experience",
    actor: "React / TypeScript / Vite",
    badge: "Untrusted UI",
    icon: Workflow,
    description: "Collects intent, renders recommendations, shows cart, requests approval, and opens Razorpay Checkout.",
    details: ["Displays product context and current cart state.", "Never owns financial authority.", "Sends current textarea value to the Agent API."],
  },
  {
    key: "auth",
    title: "Firebase Auth",
    actor: "Identity Boundary",
    badge: "Identity Boundary",
    icon: Fingerprint,
    description: "Authenticates the user, issues an ID token, and lets Flask verify the identity server-side.",
    details: ["Frontend obtains Firebase ID token.", "Backend verifies Authorization bearer token.", "Frontend-supplied user IDs are not trusted."],
  },
  {
    key: "agent",
    title: "Commerce Agent",
    actor: "Qwen / OpenRouter + Fallback",
    badge: "Bounded AI",
    icon: BrainCircuit,
    description: "Converts language into structured commerce constraints and coordinates the safe shopping flow.",
    details: ["LLM improves extraction.", "Deterministic parser keeps simple searches working.", "Agent proposes actions; it cannot execute payment."],
  },
  {
    key: "catalog",
    title: "Catalog + Recommendation",
    actor: "Supabase PostgreSQL",
    badge: "Real Catalog Only",
    icon: Database,
    description: "Queries real products, filters price and inventory, ranks matches, and proposes relevant cross-sell.",
    details: ["active=true and inventory>0 filters.", "Budget is applied in the backend query.", "Named product/SKU is prioritized when present."],
  },
  {
    key: "guardrails",
    title: "Merchant Guardrails",
    actor: "Policy Engine",
    badge: "Policy Engine",
    icon: ShieldCheck,
    description: "Checks budget, merchant limits, inventory, policy rules, and authorization requirements.",
    details: ["Result can be PASS or BLOCKED.", "Over-budget carts cannot continue.", "Policies are backend-side controls."],
  },
  {
    key: "approval",
    title: "Human Authorization",
    actor: "Customer",
    badge: "Human In The Loop",
    icon: UserCheck,
    description: "The customer must explicitly approve the proposed money action.",
    details: ["AI may prepare.", "Human authorizes.", "Approval is persisted before order creation."],
  },
  {
    key: "razorpay",
    title: "Razorpay Test Checkout",
    actor: "Razorpay",
    badge: "Money Movement",
    icon: CircleDollarSign,
    description: "Creates a test order, opens hosted Checkout, and processes the test payment.",
    details: ["Key must be test mode.", "Hosted Checkout handles payment interaction.", "No webhook is required for this demo path."],
  },
  {
    key: "verification",
    title: "Server Verification",
    actor: "Flask Backend",
    badge: "Trusted Payment Gate",
    icon: LockKeyhole,
    description: "Verifies Razorpay signature server-side before success is recorded.",
    details: ["Frontend cannot declare payment success.", "Payment IDs are verified against the checkout request.", "Only verified payment writes success state."],
  },
  {
    key: "audit",
    title: "Audit + Live Activity",
    actor: "Audit Logs + SSE",
    badge: "Explainability",
    icon: Radio,
    description: "Persists meaningful actions to audit_logs, then publishes the same event to live merchant activity.",
    details: ["Database is source of truth.", "SSE is live transport.", "Transaction Replay reads persisted events."],
  },
];

const lifecycle = [
  ["SESSION_STARTED", "Customer", "Commerce agent session opened."],
  ["INTENT_RECEIVED", "Customer", "Shopping intent received."],
  ["INTENT_PARSED", "Agent", "Prompt converted into structured constraints."],
  ["CATALOG_SEARCHED", "Agent", "Real Supabase catalog queried."],
  ["PRODUCT_RECOMMENDED", "Agent", "Ranked product recommendations returned."],
  ["CART_PREPARED", "Backend", "Cart prepared from trusted product data."],
  ["POLICY_CHECK_PASSED", "Backend", "Merchant policy allowed the action."],
  ["USER_AUTHORIZATION_RECEIVED", "Customer", "Explicit approval recorded."],
  ["RAZORPAY_ORDER_CREATED", "Razorpay", "Test order created."],
  ["PAYMENT_VERIFIED", "Backend", "Razorpay signature verified server-side."],
];

const components = [
  ["Frontend", "React / TypeScript / Vite", "Intent capture, recommendation UI, cart review, and Razorpay Checkout launch."],
  ["Auth", "Firebase", "Signs in users and supplies ID tokens for protected backend routes."],
  ["Backend", "Python / Flask", "Owns trusted execution, policy checks, order creation, and payment verification."],
  ["AI", "Qwen via OpenRouter", "Extracts intent with deterministic fallback when the provider is unavailable."],
  ["Database", "Supabase / PostgreSQL", "Stores real catalog, cart, orders, payments, audit logs, and analytics inputs."],
  ["Payments", "Razorpay Test Mode", "Creates test orders and hosts the payment step."],
  ["Observability", "Audit Logs + SSE", "Persists events first, then streams them to Merchant Dashboard and Replay."],
  ["Merchant Control", "Guardrails + Replay + Analytics", "Lets merchants inspect behavior and constrain money actions."],
];

const trustCards = [
  ["AI Agent", "Can", "interpret, search, rank, recommend, prepare cart", "Cannot", "authorize payment, change trusted prices, bypass policy, verify payment"],
  ["Customer", "Can", "edit intent, select products, approve purchase, complete Razorpay Checkout", "", ""],
  ["Merchant", "Can", "define policies, monitor activity, inspect audit trail, control campaigns", "", ""],
  ["Backend + Razorpay", "Responsible for", "identity verification, real pricing, authorization validation, order creation, payment verification", "", ""],
];

const failurePaths: Array<[string, string, LucideIcon]> = [
  ["LLM unavailable", "Deterministic parser continues", CheckCircle2],
  ["No matching products", "200 response with empty recommendations", FileSearch],
  ["Policy blocked", "Payment cannot continue", XCircle],
  ["Payment verification failed", "Transaction is not marked verified", LockKeyhole],
];

function statusLabel(value: boolean | "online" | "unknown") {
  if (value === "online" || value === true) return "ONLINE";
  if (value === false) return "CONFIGURED";
  return "CONFIGURED";
}

export default function ArchitecturePage() {
  const [selected, setSelected] = useState<NodeKey>("agent");
  const [judgeMode, setJudgeMode] = useState(false);
  const [step, setStep] = useState(0);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const selectedNode = nodes.find((node) => node.key === selected) ?? nodes[3];
  const judgePath = useMemo<NodeKey[]>(() => ["buyer", "agent", "catalog", "guardrails", "approval", "razorpay", "verification", "audit"], []);

  useEffect(() => {
    api.get<{ data: { integrations?: Record<string, boolean> } }>("/health")
      .then((response) => {
        const integrations = response.data.data.integrations ?? {};
        setHealth({
          backend: "online",
          supabase: Boolean(integrations.supabase),
          firebase: Boolean(integrations.firebase),
          razorpay: Boolean(integrations.razorpay),
          qwen: Boolean(integrations.qwen),
        });
      })
      .catch(() => setHealth({ backend: "unknown", supabase: false, firebase: false, razorpay: false, qwen: false }));
  }, []);

  useEffect(() => {
    if (!judgeMode) return;
    const timer = window.setInterval(() => setStep((value) => (value + 1) % judgePath.length), 1200);
    return () => window.clearInterval(timer);
  }, [judgeMode, judgePath.length]);

  const activeJudgeNode = judgeMode ? judgePath[step] : selected;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">SYSTEM ARCHITECTURE</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold text-ivory md:text-6xl">From intent to verified transaction</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ivory/[0.66]">
            NEXORA separates AI reasoning from trusted commerce execution. The agent can search, recommend, prepare and propose, but identity, pricing, authorization and payment verification remain controlled by trusted backend systems.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <NexoraBadge>AGENTIC COMMERCE</NexoraBadge>
            <NexoraBadge>HUMAN-GATED MONEY ACTIONS</NexoraBadge>
          </div>
        </div>
        <NexoraSurface intensity="raised" className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Live System Status</p>
          <div className="mt-4 grid gap-3 text-sm">
            {[
              ["Backend", statusLabel(health?.backend ?? "unknown")],
              ["Supabase", statusLabel(Boolean(health?.supabase))],
              ["Firebase", statusLabel(Boolean(health?.firebase))],
              ["Razorpay", health?.razorpay ? "TEST MODE" : "CONFIGURED"],
              ["Commerce Agent", health?.qwen ? "READY" : "CONFIGURED"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-line bg-black/25 px-3 py-2">
                <span className="text-ivory/[0.62]">{label}</span>
                <span className="font-mono text-xs text-ember">{value}</span>
              </div>
            ))}
          </div>
        </NexoraSurface>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_360px]">
        <NexoraSurface data-tour="architecture-map" intensity="command" className="overflow-hidden p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-gold">Main System Flow</p>
              <h2 className="mt-1 text-2xl font-semibold">Live agentic commerce map</h2>
            </div>
            <Button variant={judgeMode ? "primary" : "secondary"} icon={<Gauge size={16} />} onClick={() => { setJudgeMode((value) => !value); setStep(0); }}>
              Explain this architecture
            </Button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {nodes.map((node, index) => {
              const Icon = node.icon;
              const active = activeJudgeNode === node.key;
              return (
                <button
                  key={node.key}
                  onClick={() => { setSelected(node.key); setJudgeMode(false); }}
                  className={`relative min-h-40 rounded-md border p-4 text-left transition ${active ? "border-gold bg-gold/[0.12] shadow-[0_0_42px_rgba(109,93,251,0.18)]" : "border-line bg-black/25 hover:border-gold/40"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <Icon size={20} className="text-ember" />
                    <span className="rounded border border-line bg-black/25 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-ivory/[0.5]">{node.badge}</span>
                  </span>
                  <span className="mt-4 block text-sm font-semibold text-ivory">{node.title}</span>
                  <span className="mt-2 block text-xs leading-5 text-ivory/[0.58]">{node.description}</span>
                  {index < nodes.length - 1 ? <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gold/40 xl:block" /> : null}
                </button>
              );
            })}
          </div>
        </NexoraSurface>

        <NexoraSurface intensity="raised" className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Node Detail</p>
          <h3 className="mt-2 text-2xl font-semibold">{selectedNode.title}</h3>
          <p className="mt-2 text-sm text-ember">{selectedNode.actor}</p>
          <p className="mt-4 text-sm leading-6 text-ivory/[0.64]">{selectedNode.description}</p>
          <ul className="mt-4 space-y-2 text-sm text-ivory/[0.68]">
            {selectedNode.details.map((detail) => (
              <li key={detail} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />{detail}</li>
            ))}
          </ul>
        </NexoraSurface>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <NexoraSurface className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Who Is Trusted To Do What?</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {trustCards.map(([title, canLabel, canText, cannotLabel, cannotText]) => (
              <div key={title} className="rounded-md border border-line bg-black/25 p-4">
                <h3 className="font-semibold text-ivory">{title}</h3>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-gold">{canLabel}</p>
                <p className="mt-1 text-sm leading-6 text-ivory/[0.64]">{canText}</p>
                {cannotText ? (
                  <>
                    <p className="mt-3 text-xs uppercase tracking-[0.16em] text-red-200">{cannotLabel}</p>
                    <p className="mt-1 text-sm leading-6 text-ivory/[0.64]">{cannotText}</p>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </NexoraSurface>

        <NexoraSurface className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Why The AI Cannot Spend By Itself</p>
          <div className="mt-5 grid gap-2">
            {["AI proposal", "Merchant policy", "Human approval", "Backend authorization", "Razorpay", "Server verification"].map((item, index) => (
              <motion.div key={item} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center gap-3 rounded-md border border-line bg-black/25 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-gold/30 bg-gold/10 font-mono text-xs text-ember">{index + 1}</span>
                <span className="text-sm text-ivory/[0.72]">{item}</span>
              </motion.div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-ivory/[0.62]">The AI never receives authority to independently complete a payment.</p>
        </NexoraSurface>
      </section>

      <section className="mt-10">
        <NexoraSurface intensity="raised" className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">One Request, End To End</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Customer", "Find me gaming accessories under INR 5,000"],
              ["Structured intent", "category=Gaming, budget_max=5000, currency=INR"],
              ["Supabase", "Eligible products queried"],
              ["Agent", "Products ranked"],
              ["Guardrail", "Policy checked"],
              ["Human", "Approval required"],
              ["Razorpay", "Order created"],
              ["Backend", "Signature verified"],
              ["Audit", "PAYMENT_VERIFIED persisted"],
            ].map(([label, copy], index) => (
              <div key={label} className="rounded-md border border-line bg-black/25 p-4">
                <p className="font-mono text-xs text-ember">0{index + 1}</p>
                <h3 className="mt-2 font-semibold">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-ivory/[0.62]">{copy}</p>
              </div>
            ))}
          </div>
        </NexoraSurface>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_360px]">
        <NexoraSurface className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Transaction Lifecycle</p>
          <div className="mt-5 space-y-3">
            {lifecycle.map(([event, actor, description], index) => (
              <div key={event} className="grid gap-3 rounded-md border border-line bg-black/25 p-3 md:grid-cols-[36px_1fr_110px]">
                <span className="grid h-8 w-8 place-items-center rounded border border-gold/30 bg-gold/10 font-mono text-xs text-ember">{index + 1}</span>
                <span>
                  <span className="block text-sm font-semibold text-ivory">{event}</span>
                  <span className="text-sm text-ivory/[0.58]">{description}</span>
                </span>
                <span className="self-center rounded border border-line bg-black/25 px-2 py-1 text-center text-[11px] uppercase tracking-[0.14em] text-gold">{actor}</span>
              </div>
            ))}
          </div>
        </NexoraSurface>

        <NexoraSurface className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">External AI Buyer Flow</p>
          <div className="mt-5 space-y-2 text-sm">
            {["External AI", "Catalog Search API", "Build Cart", "Request Quote", "Request Checkout", "AWAITING_HUMAN_AUTHORIZATION", "Human approval", "Razorpay"].map((item) => (
              <div key={item} className="rounded-md border border-line bg-black/25 px-3 py-2 text-ivory/[0.68]">{item}</div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-ivory/[0.62]">An external AI can perform commerce preparation, but cannot directly spend money.</p>
          <Link to="/merchant/catalog-readiness"><Button className="mt-4 w-full" variant="secondary" icon={<Bot size={16} />}>Open AI Buyer Gateway</Button></Link>
        </NexoraSurface>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <NexoraSurface className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">System Components</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {components.map(([title, tech, copy]) => (
              <div key={title} className="rounded-md border border-line bg-black/25 p-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ember">{tech}</p>
                <p className="mt-3 text-sm leading-6 text-ivory/[0.62]">{copy}</p>
              </div>
            ))}
          </div>
        </NexoraSurface>

        <NexoraSurface className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Graceful Failure</p>
          <div className="mt-5 grid gap-3">
            {failurePaths.map(([title, copy, Icon]) => (
              <div key={String(title)} className="flex gap-3 rounded-md border border-line bg-black/25 p-4">
                <Icon size={18} className="mt-0.5 shrink-0 text-ember" />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="text-sm text-ivory/[0.62]">{copy}</span>
                </span>
              </div>
            ))}
          </div>
        </NexoraSurface>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-4">
        {[
          ["REAL DATA", "Recommendations come from Supabase."],
          ["BOUNDED AI", "Merchant policies constrain actions."],
          ["HUMAN-GATED MONEY", "Explicit approval is required."],
          ["AUDITABLE BY DESIGN", "Every meaningful action can be replayed."],
        ].map(([title, copy]) => (
          <NexoraSurface key={title} className="p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{title}</p>
            <p className="mt-3 text-sm leading-6 text-ivory/[0.64]">{copy}</p>
          </NexoraSurface>
        ))}
      </section>
    </div>
  );
}
