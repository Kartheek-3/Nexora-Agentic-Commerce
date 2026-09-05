import type { ReactNode } from "react";
import { Database, Fingerprint, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { NexoraBadge } from "../ui/NexoraSurface";

const trustItems = [
  [Database, "REAL CATALOG", "Recommendations from live merchant inventory."],
  [ShieldCheck, "HUMAN-GATED PAYMENTS", "The agent never spends by itself."],
  [Fingerprint, "AUDITABLE BY DESIGN", "Every meaningful action is recorded."],
];

export function AuthShell({ children }: { children: ReactNode; eyebrow?: string }) {
  return (
    <div className="nx-page grid min-h-[calc(100vh-72px)] items-center gap-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-12">
      <motion.section className="hidden min-w-0 lg:block" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, ease: "easeOut" }}>
        <NexoraBadge><ShieldCheck size={14} /> NEXORA AGENT COMMERCE</NexoraBadge>
        <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-ivory xl:text-6xl">
          Commerce that <span className="bg-gradient-to-r from-gold to-ember bg-clip-text text-transparent">thinks</span><br />before it transacts.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-ivory/[0.62]">AI-assisted product discovery. Human-controlled payments. Auditable commerce from intent to transaction.</p>
        <div className="mt-6 grid max-w-2xl gap-3 xl:grid-cols-3">
          {trustItems.map(([Icon, title, copy]) => (
            <div key={title as string} className="rounded-lg border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
              <Icon size={17} className="text-ember" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-ivory">{title as string}</p>
              <p className="mt-2 text-xs leading-5 text-ivory/[0.56]">{copy as string}</p>
            </div>
          ))}
        </div>
      </motion.section>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
