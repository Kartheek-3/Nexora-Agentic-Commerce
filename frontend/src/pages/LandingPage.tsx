import { Link } from "react-router-dom";
import { ArrowRight, Bot, Building2, CheckCircle2, LockKeyhole, Radar, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { motion } from "motion/react";
import { CommerceCore } from "../components/three/CommerceCore";
import { TextEffect } from "../components/motion/TextEffect";
import { Button } from "../components/ui/Button";
import { Metric } from "../components/ui/Metric";
import { NexoraBadge, NexoraSurface } from "../components/ui/NexoraSurface";

const stream = [
  ["Intent", "Constraints extracted"],
  ["Catalog", "Live products filtered"],
  ["Guardrails", "Policy checked"],
  ["Authorization", "Customer approved"],
  ["Razorpay", "Payment verified"],
];

const features = [
  [Bot, "Agent-native storefront", "Natural-language shopping that still uses real catalog, inventory, and pricing."],
  [ShieldCheck, "Financial guardrails", "Every checkout is policy checked, human authorized, and audit recorded."],
  [Radar, "Merchant intelligence", "Live activity and analytics come from recorded events, not frontend fixtures."],
];

const workflow = ["Understand intent", "Search live catalog", "Rank bounded matches", "Request approval", "Verify payment"];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      <section className="nx-page grid min-h-[calc(100vh-70px)] items-center gap-8 py-10 md:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:gap-10">
        <div className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <NexoraBadge>
              <Sparkles size={14} /> RAZORPAY BUILDATHON 2026
            </NexoraBadge>
          </motion.div>
          <h1 className="nx-heading-xl mt-7 max-w-4xl text-ivory">
            <TextEffect>Agent commerce, with humans in <span className="bg-gradient-to-r from-gold to-ember bg-clip-text text-transparent">control.</span></TextEffect>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ivory/[0.68]">
            NEXORA turns shopper intent into real catalog recommendations, explicit authorization, Razorpay checkout, and an auditable merchant operating layer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/agent"><Button icon={<ArrowRight size={17} />}>Launch Shopping Agent</Button></Link>
            <Link to="/merchant"><Button variant="secondary" icon={<Building2 size={17} />}>Merchant Command Center</Button></Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {stream.map(([label, value], index) => (
              <motion.div key={label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
                <NexoraSurface className="flex items-center gap-3 p-3" intensity="quiet">
                  <CheckCircle2 className="text-gold" size={18} />
                  <span><span className="block text-xs uppercase tracking-[0.18em] text-ivory/[0.42]">{label}</span><span className="text-sm text-ivory/[0.76]">{value}</span></span>
                </NexoraSurface>
              </motion.div>
            ))}
          </div>
        </div>
        <motion.div data-tour="hero-core" className="relative min-w-0 overflow-visible" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}>
          <div className="absolute inset-x-10 bottom-10 h-16 rounded-full bg-gold/10 blur-3xl" />
          <CommerceCore />
        </motion.div>
      </section>

      <section className="nx-page grid gap-4 pb-8 md:grid-cols-4">
        <Metric label="Explainable" value="Audit" detail="Money actions carry decision summaries." />
        <Metric label="Bounded" value="Policy" detail="Guardrails checked before execution." />
        <Metric label="Gated" value="Approval" detail="No checkout can bypass authorization." />
        <Metric label="Verified" value="Razorpay" detail="Payment success follows server verification." />
      </section>

      <section className="nx-page grid gap-5 py-10 lg:grid-cols-3">
        {features.map(([Icon, title, copy], index) => (
          <motion.div key={title as string} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
            <NexoraSurface intensity="raised" className="h-full p-5">
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-md border border-gold/30 bg-gold/10 text-ember">
                <Icon size={20} />
              </div>
              <h2 className="text-xl font-semibold text-ivory">{title as string}</h2>
              <p className="mt-3 text-sm leading-6 text-ivory/[0.62]">{copy as string}</p>
            </NexoraSurface>
          </motion.div>
        ))}
      </section>

      <section className="nx-page pb-16">
        <NexoraSurface intensity="command" className="grid gap-6 p-5 md:grid-cols-[0.8fr_1.2fr] md:p-7">
          <div>
            <p className="nx-kicker">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold text-ivory">From prompt to paid order without losing trust.</h2>
            <p className="mt-4 text-sm leading-6 text-ivory/[0.64]">The commerce agent can search and recommend, but checkout remains explicit, traceable, and merchant-governed.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-md border border-line bg-black/25 p-3">
                <span className="text-xs font-semibold text-gold">0{index + 1}</span>
                <p className="mt-3 text-sm font-semibold text-ivory">{step}</p>
              </div>
            ))}
          </div>
        </NexoraSurface>
      </section>

      <footer className="border-t border-line py-8">
        <div className="nx-page flex flex-col gap-3 text-sm text-ivory/[0.54] sm:flex-row sm:items-center sm:justify-between">
          <span>NEXORA agent commerce infrastructure</span>
          <span className="inline-flex items-center gap-2"><LockKeyhole size={14} /> Human approval remains mandatory</span>
          <span className="inline-flex items-center gap-2"><Zap size={14} /> Built for real catalog execution</span>
        </div>
      </footer>
    </div>
  );
}
