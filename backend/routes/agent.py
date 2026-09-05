from __future__ import annotations

import traceback

from flask import Blueprint, g, request
from pydantic import ValidationError

from backend.agent.orchestrator import AgentPipelineError, run_commerce_agent
from backend.agent.orchestrator import structure_intent
from backend.agent.schemas import CheckoutRequest, RecommendationActionRequest, SearchRequest
from backend.config import config
from backend.middleware.firebase_auth import firebase_auth_required
from backend.services.audit_service import record_event
from backend.services.catalog_service import get_product, list_catalog, search_catalog
from backend.services.guardrail_service import check_checkout
from backend.services.supabase_service import accept_recommendation, decline_recommendation, fetch_recommendation
from backend.utils.errors import fail, ok

bp = Blueprint("agent", __name__, url_prefix="/api/agent")


@bp.get("/catalog")
def catalog():
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 24)), 100)
    return ok(list_catalog(page, page_size))


@bp.get("/products/<product_id>")
def product(product_id: str):
    found = get_product(product_id)
    if not found:
        return fail("Product not found.", 404, "NOT_FOUND")
    return ok(found)


@bp.post("/search")
def search():
    try:
        payload = SearchRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    record_event("CATALOG_SEARCH", "Agent searched catalog.", {"query": payload.query, "risk_level": "LOW"})
    return ok(search_catalog(payload.query, payload.max_price))


@bp.post("/run")
def run():
    message = request.get_json(force=True).get("message", "")
    if not message.strip():
        return fail("Agent prompt is required.", 400, "INVALID_AGENT_PROMPT")
    try:
        result = run_commerce_agent(message)
    except AgentPipelineError as exc:
        return fail(str(exc), exc.status, exc.code)
    except Exception as exc:
        if str(exc) == "INVALID_AGENT_PROMPT":
            return fail("Agent prompt is required.", 400, "INVALID_AGENT_PROMPT")
        message = str(exc)[:500]
        print(f"[agent] unexpected failure exception={type(exc).__name__} message={message}", flush=True)
        print("[agent] unexpected traceback=" + traceback.format_exc()[-4000:], flush=True)
        return fail("Commerce Agent is temporarily unavailable. Please try again.", 503, "AGENT_SERVICE_UNAVAILABLE")
    try:
        return ok(result)
    except Exception as exc:
        message = str(exc)[:500]
        print(f"[agent] response serialization failed exception={type(exc).__name__} message={message}", flush=True)
        print("[agent] response serialization traceback=" + traceback.format_exc()[-4000:], flush=True)
        return fail("Commerce Agent is temporarily unavailable. Please try again.", 503, "AGENT_RESPONSE_SERIALIZATION_FAILED")


@bp.post("/recommendations/<recommendation_id>/accept")
@firebase_auth_required
def accept_cross_sell(recommendation_id: str):
    try:
        payload = RecommendationActionRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    recommendation = fetch_recommendation(recommendation_id)
    if not recommendation:
        return fail("Recommendation not found.", 404, "RECOMMENDATION_NOT_FOUND")
    agent_session_id = str(payload.agent_session_id)
    if recommendation.get("agent_session_id") != agent_session_id:
        return fail("Recommendation belongs to a different agent session.", 409, "RECOMMENDATION_SESSION_MISMATCH")
    product = recommendation.get("products") or {}
    price = int(product.get("price_inr") or 0)
    accepted = accept_recommendation(recommendation_id, price)
    record_event(
        "CROSS_SELL_ACCEPTED",
        "Customer accepted an agent cross-sell recommendation.",
        {"recommendation_id": recommendation_id, "product_id": recommendation.get("product_id"), "risk_level": "LOW", "actor_id": g.user.get("uid")},
        actor="customer",
        action="accept_cross_sell",
        agent_session_id=agent_session_id,
    )
    return ok({"recommendation_id": recommendation_id, "status": accepted.get("status", "accepted")})


@bp.post("/recommendations/<recommendation_id>/decline")
@firebase_auth_required
def decline_cross_sell(recommendation_id: str):
    try:
        payload = RecommendationActionRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    recommendation = fetch_recommendation(recommendation_id)
    if not recommendation:
        return fail("Recommendation not found.", 404, "RECOMMENDATION_NOT_FOUND")
    agent_session_id = str(payload.agent_session_id)
    if recommendation.get("agent_session_id") != agent_session_id:
        return fail("Recommendation belongs to a different agent session.", 409, "RECOMMENDATION_SESSION_MISMATCH")
    declined = decline_recommendation(recommendation_id)
    record_event(
        "CROSS_SELL_DECLINED",
        "Customer declined an agent cross-sell recommendation.",
        {"recommendation_id": recommendation_id, "product_id": recommendation.get("product_id"), "risk_level": "LOW", "actor_id": g.user.get("uid")},
        actor="customer",
        action="decline_cross_sell",
        agent_session_id=agent_session_id,
    )
    return ok({"recommendation_id": recommendation_id, "status": declined.get("status", "declined")})


@bp.post("/test-llm")
def test_llm():
    if config.flask_env == "production":
        return fail("LLM test endpoint is disabled in production.", 404, "NOT_FOUND")
    message = request.get_json(force=True).get("message", "")
    try:
        intent = structure_intent(message)
    except Exception as exc:
        return fail(str(exc), 503, "LLM_UNAVAILABLE")
    return ok({"provider": "qwen", "model": config.ai_model, "intent": intent.model_dump()})


@bp.post("/checkout")
def checkout_proposal():
    try:
        payload = CheckoutRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    policy = check_checkout(3698)
    record_event("CHECKOUT_PROPOSED", "Agent created a checkout proposal; execution remains gated.", {"cart_id": payload.cart_id, **policy})
    return ok({"action_state": "AWAITING_APPROVAL", "requires_approval": True, "policy": policy, "idempotency_key": payload.idempotency_key})
