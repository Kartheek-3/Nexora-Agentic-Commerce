import { auditEvents, failureAuditEvents } from "../data/demo";
import type { AuditEvent } from "../types/commerce";

const auditKey = "nexora.demo.audit";
const metricsKey = "nexora.demo.metrics";

export type DemoMetrics = {
  aiAssistedRevenue: number;
  transactions: number;
  recoveredRevenue: number;
};

export function getDemoAudit(): AuditEvent[] {
  const stored = window.localStorage.getItem(auditKey);
  if (!stored) return auditEvents;
  try {
    return JSON.parse(stored) as AuditEvent[];
  } catch {
    return auditEvents;
  }
}

export function appendDemoAudit(events: AuditEvent[]) {
  const existing = getDemoAudit();
  const ids = new Set(existing.map((event) => event.id));
  const merged = [...existing, ...events.filter((event) => !ids.has(event.id))];
  window.localStorage.setItem(auditKey, JSON.stringify(merged));
  return merged;
}

export function recordDemoSuccess() {
  appendDemoAudit([]);
  const metrics = getDemoMetrics();
  window.localStorage.setItem(
    metricsKey,
    JSON.stringify({ ...metrics, aiAssistedRevenue: metrics.aiAssistedRevenue + 3698, transactions: metrics.transactions + 1 }),
  );
}

export function recordDemoFailure() {
  appendDemoAudit(failureAuditEvents);
  const metrics = getDemoMetrics();
  window.localStorage.setItem(metricsKey, JSON.stringify({ ...metrics, recoveredRevenue: metrics.recoveredRevenue + 3698 }));
}

export function getDemoMetrics(): DemoMetrics {
  const stored = window.localStorage.getItem(metricsKey);
  if (!stored) return { aiAssistedRevenue: 184230, transactions: 132, recoveredRevenue: 41200 };
  try {
    return JSON.parse(stored) as DemoMetrics;
  } catch {
    return { aiAssistedRevenue: 184230, transactions: 132, recoveredRevenue: 41200 };
  }
}
