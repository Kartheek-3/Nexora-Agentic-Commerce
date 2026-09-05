from __future__ import annotations

from flask import Blueprint, request

from backend.middleware.firebase_auth import firebase_auth_required
from backend.services.audit_service import record_event
from backend.services.campaign_service import generate_campaign
from backend.utils.errors import ok

bp = Blueprint("campaigns", __name__, url_prefix="/api/campaigns")


@bp.post("/generate")
@firebase_auth_required
def generate():
    prompt = request.get_json(force=True).get("prompt", "")
    record_event("CAMPAIGN_GENERATED", "Cart recovery campaign generated; send requires approval.", {"prompt": prompt, "authorization_status": "REQUIRED"})
    return ok(generate_campaign(prompt))
