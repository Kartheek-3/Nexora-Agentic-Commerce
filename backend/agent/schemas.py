from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class Budget(BaseModel):
    max: int = Field(gt=0)
    currency: str = "INR"


class Intent(BaseModel):
    intent: str
    category: str | None = None
    subcategories: list[str] = []
    recipient: str | None = None
    occasion: str | None = None
    budget: Budget | None = None
    keywords: list[str] = []
    preferences: list[str] = []
    constraints: list[str] = []


class SearchRequest(BaseModel):
    query: str
    max_price: int | None = None


class CheckoutRequest(BaseModel):
    cart_id: str
    idempotency_key: str = Field(min_length=12)
    agent_action_id: str | None = None
    agent_session_id: UUID | None = None


class AuthorizeCheckoutRequest(BaseModel):
    cart_id: str
    idempotency_key: str = Field(min_length=12)
    agent_action_id: str | None = None
    agent_session_id: UUID | None = None


class VerifyPaymentRequest(BaseModel):
    checkout_request_id: str | None = None
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class FailureRequest(BaseModel):
    razorpay_order_id: str
    reason: str = "demo_failure"
