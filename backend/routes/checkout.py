from __future__ import annotations

import traceback

from flask import Blueprint, request
from flask import g
from pydantic import ValidationError

from backend.agent.schemas import AuthorizeCheckoutRequest, CheckoutFunnelStartRequest, CheckoutRequest, FailureRequest, VerifyPaymentRequest
from backend.middleware.firebase_auth import firebase_auth_required
from backend.services.audit_service import record_event
from backend.services.checkout_service import CheckoutError, authorize_checkout as authorize_checkout_service, create_checkout_order as create_checkout_order_service
from backend.services.checkout_service import record_checkout_failure_attempt, start_checkout_funnel, verify_checkout_payment
from backend.utils.errors import fail, ok

bp = Blueprint("checkout", __name__, url_prefix="/api/checkout")


@bp.post("/authorize")
@firebase_auth_required
def authorize_checkout():
    try:
        payload = AuthorizeCheckoutRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    try:
        agent_session_id = str(payload.agent_session_id) if payload.agent_session_id else None
        funnel_session_id = str(payload.funnel_session_id) if payload.funnel_session_id else None
        return ok(authorize_checkout_service(payload.cart_id, payload.idempotency_key, g.user["uid"], payload.agent_action_id, g.user.get("email"), agent_session_id, funnel_session_id))
    except CheckoutError as exc:
        record_event(exc.code, str(exc), {"cart_id": payload.cart_id, "risk_level": "MEDIUM"}, "FAILED")
        return fail(str(exc), exc.status, exc.code)
    except Exception as exc:
        print(f"[checkout-backend] unexpected authorize failure exception={type(exc).__name__}", flush=True)
        traceback.print_exc()
        return fail("Checkout authorization could not be recorded.", 500, "CHECKOUT_AUTHORIZATION_INTERNAL_ERROR")


@bp.post("/create-order")
@firebase_auth_required
def create_checkout_order():
    try:
        payload = CheckoutRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    try:
        agent_session_id = str(payload.agent_session_id) if payload.agent_session_id else None
        funnel_session_id = str(payload.funnel_session_id) if payload.funnel_session_id else None
        return ok(create_checkout_order_service(payload.cart_id, payload.idempotency_key, g.user["uid"], payload.agent_action_id, g.user.get("email"), agent_session_id, funnel_session_id))
    except CheckoutError as exc:
        record_event(exc.code, str(exc), {"cart_id": payload.cart_id, "risk_level": "MEDIUM"}, "FAILED")
        return fail(str(exc), exc.status, exc.code)
    except Exception as exc:
        print(f"[checkout-backend] unexpected create-order failure exception={type(exc).__name__}", flush=True)
        traceback.print_exc()
        return fail("Checkout order could not be created.", 500, "CHECKOUT_INTERNAL_ERROR")


@bp.post("/verify")
@firebase_auth_required
def verify():
    try:
        payload = VerifyPaymentRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    try:
        return ok(verify_checkout_payment(payload.checkout_request_id, payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature, g.user["uid"]))
    except CheckoutError as exc:
        record_event(exc.code, str(exc), {"order_id": payload.razorpay_order_id, "risk_level": "HIGH"}, "FAILED")
        return fail(str(exc), exc.status, exc.code)


@bp.post("/funnel/start")
@firebase_auth_required
def funnel_start():
    try:
        payload = CheckoutFunnelStartRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    try:
        agent_session_id = str(payload.agent_session_id) if payload.agent_session_id else None
        return ok(start_checkout_funnel(payload.funnel_key, g.user["uid"], g.user.get("email"), agent_session_id))
    except CheckoutError as exc:
        return fail(str(exc), exc.status, exc.code)


@bp.post("/failure")
@firebase_auth_required
def failure():
    try:
        payload = FailureRequest.model_validate(request.get_json(force=True))
    except ValidationError as exc:
        return fail(exc.errors()[0]["msg"], 422, "VALIDATION_ERROR")
    funnel_session_id = str(payload.funnel_session_id) if payload.funnel_session_id else None
    result = record_checkout_failure_attempt(payload.razorpay_order_id, payload.reason, funnel_session_id)
    for event_type in ["DUPLICATE_EXECUTION_PREVENTED", "USER_NOTIFIED"]:
        record_event(event_type, "Controlled failure path handled gracefully.", {"order_id": payload.razorpay_order_id}, "FAILED" if event_type == "PAYMENT_FAILED" else "COMPLETED")
    return ok(result)
