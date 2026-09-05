export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  inventory: number;
  image: string;
  description: string;
  attributes: Record<string, string | string[]>;
  matchReasons: string[];
  matchScore: number;
};

export type CartItem = Product & { quantity: number };

export type AuditEvent = {
  id: string;
  time: string;
  actor: "customer" | "agent" | "system" | "razorpay" | "merchant";
  eventType: string;
  description: string;
  input: string;
  output: string;
  reason: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  authorization: string;
  status: "PROPOSED" | "POLICY_CHECK" | "AWAITING_APPROVAL" | "APPROVED" | "EXECUTING" | "COMPLETED" | "FAILED";
};

export type Guardrails = {
  maximumTransactionValue: number;
  maximumDiscountPercentage: number;
  maximumCampaignSpend: number;
  allowCartEditing: boolean;
  allowUpselling: boolean;
  allowCrossSelling: boolean;
  allowCampaignGeneration: boolean;
  allowCampaignSending: boolean;
  requirePaymentAuthorization: boolean;
  maximumRecommendedCartValue: number;
  allowedCategories: string[];
  allowedTools: string[];
};
