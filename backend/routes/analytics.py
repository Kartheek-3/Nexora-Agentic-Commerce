from __future__ import annotations

from flask import Blueprint

from backend.middleware.firebase_auth import firebase_auth_required
from backend.services.analytics_service import merchant_metrics
from backend.utils.errors import ok

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@bp.get("/merchant")
@firebase_auth_required
def merchant():
    return ok(merchant_metrics())
