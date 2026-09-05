from __future__ import annotations

from flask import Blueprint, request

from backend.middleware.firebase_auth import firebase_auth_required
from backend.services.audit_service import get_session_events, list_events
from backend.utils.errors import ok

bp = Blueprint("audit", __name__, url_prefix="/api/audit")


@bp.get("")
@firebase_auth_required
def audit():
    limit = min(int(request.args.get("limit", 50)), 100)
    return ok(list_events(limit))


@bp.get("/sessions/<session_id>/events")
@firebase_auth_required
def replay(session_id: str):
    return ok({"session_id": session_id, "events": get_session_events(session_id)})
