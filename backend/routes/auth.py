from __future__ import annotations

from flask import Blueprint, g

from backend.middleware.firebase_auth import firebase_auth_required
from backend.utils.errors import ok

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.get("/me")
@firebase_auth_required
def me():
    return ok({"authenticated": True, "uid": g.user.get("uid"), "email": g.user.get("email")})
