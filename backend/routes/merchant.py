from __future__ import annotations

from flask import Blueprint, request

from backend.middleware.firebase_auth import firebase_auth_required
from backend.services.analytics_service import merchant_metrics
from backend.services.audit_service import list_events
from backend.services.evaluation_service import run_evaluations
from backend.services.guardrail_service import DEFAULT_GUARDRAILS, simulate_policy
from backend.utils.errors import ok

bp = Blueprint("merchant", __name__, url_prefix="/api/merchant")


@bp.get("/analytics")
@firebase_auth_required
def analytics():
    return ok(merchant_metrics())


@bp.get("/guardrails")
@firebase_auth_required
def guardrails():
    return ok(DEFAULT_GUARDRAILS)


@bp.post("/guardrails/simulate")
@firebase_auth_required
def simulate_guardrails():
    body = request.get_json(silent=True) or {}
    return ok(
        simulate_policy(
            action_type=body.get("action_type", "request_checkout"),
            amount=int(body.get("amount", 0)),
            discount_percent=int(body.get("discount_percent", 0)),
            category=body.get("category", ""),
        )
    )


@bp.get("/audit")
@firebase_auth_required
def audit():
    limit = min(int(request.args.get("limit", 50)), 100)
    return ok(list_events(limit))


@bp.get("/activity")
@firebase_auth_required
def activity():
    limit = min(int(request.args.get("limit", 50)), 100)
    return ok({"items": list_events(limit)})


@bp.get("/catalog-readiness")
@firebase_auth_required
def readiness():
    return ok({"catalog_readability": 98, "ai_discoverability": 94, "inventory_accessibility": 100, "checkout_compatibility": 100, "schema_coverage": 97})


@bp.post("/evaluations/run")
@firebase_auth_required
def evaluations():
    return ok(run_evaluations())
