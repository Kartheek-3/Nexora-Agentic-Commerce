import { NexoraSurface } from "./NexoraSurface";
import { motion } from "motion/react";

export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <NexoraSurface intensity="raised" className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-ivory/[0.48]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-ivory md:text-3xl">{value}</p>
      <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} className="mt-4 h-px origin-left bg-gradient-to-r from-gold via-ember to-transparent" />
      {detail ? <p className="mt-2 text-sm text-ivory/[0.58]">{detail}</p> : null}
    </NexoraSurface>
  );
}
