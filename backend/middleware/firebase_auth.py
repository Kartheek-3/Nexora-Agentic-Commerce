from __future__ import annotations

from functools import wraps
from typing import Callable

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from firebase_admin.exceptions import FirebaseError
from flask import g, request

from backend.config import config
from backend.utils.errors import fail


def _auth_log(message: str, **metadata) -> None:
    safe = " ".join(f"{key}={value}" for key, value in metadata.items() if value is not None)
    print(f"[firebase-auth] {message}{' ' + safe if safe else ''}", flush=True)


def _ensure_app() -> None:
    if firebase_admin._apps:
        return
    if not (config.firebase_project_id and config.firebase_private_key and config.firebase_client_email):
        return
    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": config.firebase_project_id,
            "private_key": config.firebase_private_key,
            "client_email": config.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    )
    firebase_admin.initialize_app(cred)


def firebase_auth_required(fn: Callable):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if config.demo_mode:
            g.user = {"uid": "demo_user", "email": "demo@nexora.ai"}
            return fn(*args, **kwargs)
        header = request.headers.get("Authorization", "")
        _auth_log("route", route=request.path)
        _auth_log("authorization header present", present=bool(header))
        if not header.startswith("Bearer "):
            _auth_log("bearer format valid", valid=False)
            if not header:
                _auth_log("Authorization header missing", path=request.path)
                return fail("Missing Firebase bearer token.", 401, "AUTH_HEADER_MISSING")
            _auth_log("Authorization header malformed", path=request.path)
            return fail("Malformed Firebase bearer token.", 401, "AUTH_HEADER_MALFORMED")
        _auth_log("bearer format valid", valid=True)
        token = header.removeprefix("Bearer ").strip()
        if not token:
            _auth_log("Bearer token empty", path=request.path)
            return fail("Malformed Firebase bearer token.", 401, "AUTH_HEADER_MALFORMED")
        _ensure_app()
        _auth_log("firebase admin initialized", initialized=bool(firebase_admin._apps))
        if not firebase_admin._apps:
            _auth_log("Firebase Admin initialization unavailable", project_configured=bool(config.firebase_project_id), client_email_configured=bool(config.firebase_client_email), private_key_configured=bool(config.firebase_private_key))
            return fail("Firebase Admin is not configured.", 401, "FIREBASE_ADMIN_UNAVAILABLE")
        try:
            _auth_log("verification starting")
            decoded = firebase_auth.verify_id_token(token)
        except (ValueError, FirebaseError) as exc:
            _auth_log("token verification failed", exception=type(exc).__name__, path=request.path)
            exception_name = type(exc).__name__
            if exception_name == "ExpiredIdTokenError":
                code = "FIREBASE_TOKEN_EXPIRED"
            elif exception_name == "InvalidIdTokenError":
                code = "FIREBASE_TOKEN_INVALID"
            elif exception_name == "RevokedIdTokenError":
                code = "FIREBASE_TOKEN_REVOKED"
            elif exception_name == "CertificateFetchError":
                code = "FIREBASE_CERTIFICATE_FETCH_FAILED"
            else:
                code = "FIREBASE_TOKEN_INVALID"
            return fail("Invalid or expired Firebase token.", 401, code)
        _auth_log("token verified", path=request.path)
        _auth_log("uid present", present=bool(decoded.get("uid")))
        g.user = decoded
        return fn(*args, **kwargs)

    return wrapper
