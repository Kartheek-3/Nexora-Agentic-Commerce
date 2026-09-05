from __future__ import annotations

import hmac
from hashlib import sha256
from typing import Any

from backend.config import config

EXECUTIONS: dict[str, dict[str, Any]] = {}


def _key_fingerprint() -> str:
    if not config.razorpay_key_id:
        return "missing"
    return f"{config.razorpay_key_id[:8]}...{config.razorpay_key_id[-4:]}"


def razorpay_readiness_metadata(amount_paise: int, currency: str) -> dict[str, Any]:
    return {
        "key_id_present": bool(config.razorpay_key_id),
        "key_id_mode": "test" if config.razorpay_key_id.startswith("rzp_test_") else "invalid",
        "key_fingerprint": _key_fingerprint(),
        "secret_present": bool(config.razorpay_key_secret),
        "demo_mode": config.demo_mode,
        "amount": amount_paise,
        "currency": currency,
    }


def _client():
    try:
        import razorpay
    except ModuleNotFoundError as exc:
        print(f"[razorpay] SDK import failed missing_module={exc.name}", flush=True)
        raise

    return razorpay.Client(auth=(config.razorpay_key_id, config.razorpay_key_secret))


def razorpay_test_mode_ready() -> bool:
    return bool(config.razorpay_key_id and config.razorpay_key_secret and config.razorpay_key_id.startswith("rzp_test_"))


def validate_order(order: dict[str, Any], amount_paise: int, currency: str) -> dict[str, Any]:
    order_id = str(order.get("id") or "")
    order_currency = str(order.get("currency") or "")
    order_status = str(order.get("status") or "")
    amount_matches = int(order.get("amount") or 0) == int(amount_paise)
    currency_matches = order_currency.upper() == currency.upper()
    print(f"[razorpay] backend key id present={bool(config.razorpay_key_id)}", flush=True)
    print(f"[razorpay] backend key mode={'test' if config.razorpay_key_id.startswith('rzp_test_') else 'invalid'}", flush=True)
    print(f"[razorpay] key fingerprint={_key_fingerprint()}", flush=True)
    print(f"[razorpay] razorpay order id present={bool(order_id)}", flush=True)
    print(f"[razorpay] order validation id_valid={order_id.startswith('order_')} amount_matches={amount_matches} currency_matches={currency_matches} status={order_status}", flush=True)
    if not config.razorpay_key_id.startswith("rzp_test_"):
        raise RuntimeError("Razorpay live keys are disabled for this development flow.")
    if not order_id.startswith("order_"):
        raise RuntimeError("Razorpay order id is invalid for hosted checkout.")
    if not amount_matches:
        raise RuntimeError("Razorpay order amount does not match server calculation.")
    if not currency_matches:
        raise RuntimeError("Razorpay order currency does not match server calculation.")
    if order_status and order_status not in {"created", "attempted"}:
        raise RuntimeError("Razorpay order is not reusable for checkout.")
    return order


def fetch_order(order_id: str) -> dict[str, Any]:
    if config.demo_mode:
        return EXECUTIONS.get(order_id, {"id": order_id, "status": "created"})
    return _client().order.fetch(order_id)


def create_order(amount_paise: int, currency: str, receipt: str, idempotency_key: str) -> dict[str, Any]:
    if idempotency_key in EXECUTIONS:
        existing = EXECUTIONS[idempotency_key]
        if not config.demo_mode and str(existing.get("id", "")).startswith("order_"):
            current = fetch_order(existing["id"])
            if str(current.get("status", "")) in {"paid"}:
                print("[razorpay] existing order paid; creating fresh test order", flush=True)
            else:
                return {**validate_order(current, amount_paise, currency), "idempotent_replay": True}
        elif config.demo_mode:
            return {**existing, "idempotent_replay": True}
    if config.razorpay_key_id and not config.razorpay_key_id.startswith("rzp_test_"):
        raise RuntimeError("Razorpay live keys are disabled for this development flow.")
    if config.demo_mode or not (config.razorpay_key_id and config.razorpay_key_secret):
        order = {"id": f"order_test_nexora_{amount_paise}", "amount": amount_paise, "currency": currency, "receipt": receipt, "status": "created"}
    else:
        order = _client().order.create({"amount": amount_paise, "currency": currency, "receipt": receipt})
    order = validate_order(order, amount_paise, currency) if not config.demo_mode else order
    EXECUTIONS[idempotency_key] = order
    return order


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if config.demo_mode:
        return signature.startswith("demo_")
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(config.razorpay_key_secret.encode(), body, sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def fetch_payment(payment_id: str) -> dict[str, Any]:
    if config.demo_mode:
        return {"id": payment_id, "status": "captured", "method": "demo", "amount": 369800}
    return _client().payment.fetch(payment_id)


def handle_payment_failure(order_id: str, reason: str) -> dict[str, Any]:
    return {"order_id": order_id, "captured": False, "cart_preserved": True, "duplicate_execution_prevented": True, "reason": reason}
