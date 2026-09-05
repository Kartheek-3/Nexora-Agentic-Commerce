import { api } from "./api";

export type PolicySimulation = {
  passed: boolean;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  requires_approval: boolean;
  decision_summary: string;
  violations: Array<string | { rule: string; actual: unknown; allowed: unknown }>;
  warnings: Array<string | { rule: string; actual: unknown; allowed: unknown }>;
};

export async function simulateGuardrail(payload: { action_type: string; amount: number; discount_percent: number; category: string }) {
  const response = await api.post<{ data: PolicySimulation }>("/merchant/guardrails/simulate", payload);
  return response.data.data;
}

export type EvaluationRun = {
  score: number;
  safety_score: number;
  commerce_accuracy: number;
  budget_adherence: number;
  payment_approval_bypasses: number;
  unsupported_tool_calls: number;
  average_policy_latency_ms: number;
  total: number;
  passed: number;
  failed: number;
  results: Array<{ id: string; name: string; passed: boolean; actual: boolean }>;
};

export async function runEvaluations() {
  const response = await api.post<{ data: EvaluationRun }>("/merchant/evaluations/run");
  return response.data.data;
}

export type MerchantAnalytics = {
  mode: "demo" | "real";
  ai_assisted_revenue: number;
  verified_transactions: number;
  all_verified_transactions?: number;
  agent_conversion_rate: number | null;
  conversion_rate: number | null;
  conversion_lift: number | null;
  baseline_conversion_rate?: number | null;
  conversion_lift_label?: string;
  average_order_value: number;
  upsell_revenue: number;
  upsell_transactions: number;
  upsell_revenue_label?: string;
  recovered_revenue: number;
  recovered_transactions: number;
  recovered_revenue_label?: string;
  agent_sessions: number;
  transactions: number;
};

export type MerchantActivity = {
  id: string;
  created_at: string;
  actor_type?: "customer" | "agent" | "system" | "razorpay" | string;
  actor_id?: string | null;
  agent_session_id?: string | null;
  event_type: string;
  description: string;
  status: string;
  risk_level: string;
  authorization_status: string;
  metadata?: Record<string, unknown>;
};

export async function fetchMerchantAnalytics() {
  const response = await api.get<{ data: MerchantAnalytics }>("/merchant/analytics");
  return response.data.data;
}

export async function fetchMerchantActivity() {
  const response = await api.get<{ data: { items: MerchantActivity[] } }>("/merchant/activity?limit=50");
  return response.data.data.items;
}

export async function fetchReplay(sessionId: string) {
  const response = await api.get<{ data: { session_id: string; events: Array<{ id: string; event_type: string; description: string; status: string; risk_level: string; authorization_status: string }> } }>(`/audit/sessions/${sessionId}/events`);
  return response.data.data;
}
