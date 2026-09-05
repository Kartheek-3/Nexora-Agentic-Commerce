import { api } from "./api";
import axios from "axios";
import type { Product } from "../types/commerce";

export async function searchAgentCatalog(query: string): Promise<Product[]> {
  const response = await api.post<{ data: Product[] }>("/agent/search", { query });
  return response.data.data;
}

export type AgentRunResponse = {
  request_id: string;
  agent_session_id: string | null;
  structured_intent: Record<string, unknown>;
  candidate_count: number;
  recommendations: Array<{ product: Product; score: number; reason: string; within_budget: boolean }>;
  cross_sell: Array<{ product?: Product; new_total?: number; within_budget?: boolean; decision_summary?: string }>;
  constraints: Record<string, unknown>;
};

export async function runCommerceAgent(message: string): Promise<AgentRunResponse> {
  const response = await api.post<{ data: AgentRunResponse }>("/agent/run", { message });
  return response.data.data;
}

export function agentErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    return code ? `Commerce Agent is temporarily unavailable. Please try again. (${code})` : "Commerce Agent is temporarily unavailable. Please try again.";
  }
  return "Commerce Agent is temporarily unavailable. Please try again.";
}
