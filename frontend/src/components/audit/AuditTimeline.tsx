import { useState } from "react";
import { motion } from "motion/react";
import type { AuditEvent } from "../../types/commerce";
import { NexoraSurface } from "../ui/NexoraSurface";

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  const [selected, setSelected] = useState(events[0]);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[41px] before:top-4 before:w-px before:bg-gradient-to-b before:from-gold before:via-gold/30 before:to-transparent">
        {events.map((event) => (
          <motion.button
            key={event.id}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => setSelected(event)}
            className="nx-surface grid w-full grid-cols-[84px_1fr_auto] items-center gap-4 rounded-lg p-4 text-left transition hover:border-gold/40 max-sm:grid-cols-1"
          >
            <span className="font-mono text-sm text-ivory/50 before:mr-3 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-gold before:shadow-[0_0_18px_rgba(217,164,65,0.8)]">{event.time}</span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.12em] text-ember">{event.eventType}</span>
              <span className="mt-1 block text-sm text-ivory/[0.62]">{event.description}</span>
            </span>
            <span className="rounded border border-line px-2 py-1 text-xs text-ivory/[0.58]">{event.status}</span>
          </motion.button>
        ))}
      </div>
      <NexoraSurface intensity="command" className="p-5 lg:sticky lg:top-24 lg:self-start">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Audit Inspector</p>
        <h3 className="mt-2 text-2xl font-semibold">{selected.eventType}</h3>
        <dl className="mt-5 space-y-4 text-sm">
          {[
            ["Actor", selected.actor],
            ["Input", selected.input],
            ["Output", selected.output],
            ["Decision Summary", selected.reason],
            ["Risk", selected.risk],
            ["Authorization", selected.authorization],
            ["Execution", selected.status],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-ivory/[0.42]">{label}</dt>
              <dd className="mt-1 leading-6 text-ivory/[0.76]">{value}</dd>
            </div>
          ))}
        </dl>
      </NexoraSurface>
    </div>
  );
}
