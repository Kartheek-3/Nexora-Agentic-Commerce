from __future__ import annotations

from flask import Blueprint, request
from pydantic import ValidationError

from backend.agent.orchestrator import AgentPipelineError, run_commerce_agent
from backend.agent.orchestrator import structure_intent
from backend.agent.schemas import CheckoutRequest, SearchRequest
from backend.config import config
from backend.services.audit_service import record_event
from backend.services.catalog_service import get_product, list_catalog, search_catalog
from backend.services.guardrail_service import check_checkout
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
        return ok(run_commerce_agent(message))
    except AgentPipelineError as exc:
        return fail(str(exc), exc.status, exc.code)
    except Exception as exc:
        if str(exc) == "INVALID_AGENT_PROMPT":
            return fail("Agent prompt is required.", 400, "INVALID_AGENT_PROMPT")
        print(f"[agent] unexpected failure exception={type(exc).__name__}", flush=True)
        return fail("Commerce Agent is temporarily unavailable. Please try again.", 503, "AGENT_SERVICE_UNAVAILABLE")


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
