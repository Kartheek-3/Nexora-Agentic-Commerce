import { useEffect, useMemo, useState } from "react";
import { AuditTimeline } from "../components/audit/AuditTimeline";
import { Button } from "../components/ui/Button";
import { NexoraSurface } from "../components/ui/NexoraSurface";
import { getDemoAudit } from "../lib/demoState";
import { fetchReplay } from "../services/merchant";

export default function MerchantAudit() {
  const events = useMemo(() => getDemoAudit(), []);
  const [replay, setReplay] = useState(events);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const current = replay[cursor] || events[0];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setCursor((value) => (value + 1) % replay.length), speed);
    return () => window.clearTimeout(timer);
  }, [cursor, playing, replay.length, speed]);

  const loadReplay = async () => {
    try {
      const payload = await fetchReplay("demo_birthday_jewellery");
      setReplay(payload.events.map((event, index) => ({
        id: event.id,
        time: String(index + 1).padStart(2, "0"),
        actor: "system" as const,
        eventType: event.event_type,
        description: event.description,
        input: "Replay session event",
        output: event.status,
        reason: event.authorization_status,
        risk: event.risk_level as "LOW" | "MEDIUM" | "HIGH",
        authorization: event.authorization_status,
        status: event.status as typeof events[number]["status"],
      })));
      setCursor(0);
    } catch {
      setReplay(events);
      setCursor(0);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">Explainable Money Actions</p>
      <h1 className="mt-2 text-4xl font-semibold">Audit trail</h1>
      <p className="mt-4 max-w-2xl text-ivory/[0.62]">Each event contains actor, input, output, decision summary, risk, authorization and execution status. No private chain-of-thought is exposed.</p>
      <NexoraSurface intensity="raised" className="mt-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Transaction Replay</p>
            <h2 className="mt-2 text-2xl font-semibold">{current.eventType}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadReplay}>Load Replay</Button>
            <Button onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</Button>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-ivory/65">{current.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={() => setCursor((value) => Math.max(0, value - 1))}>Previous</Button>
          <input className="min-w-48 flex-1 accent-gold" type="range" min={0} max={Math.max(0, replay.length - 1)} value={cursor} onChange={(event) => setCursor(Number(event.currentTarget.value))} />
          <Button variant="ghost" onClick={() => setCursor((value) => Math.min(replay.length - 1, value + 1))}>Next</Button>
          <select className="input-premium rounded-md px-3 py-2 text-sm text-ivory" value={speed} onChange={(event) => setSpeed(Number(event.currentTarget.value))}>
            <option value={1300}>0.75x</option>
            <option value={900}>1x</option>
            <option value={500}>2x</option>
          </select>
        </div>
      </NexoraSurface>
      <div className="mt-8"><AuditTimeline events={events} /></div>
    </div>
  );
}
