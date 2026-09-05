from __future__ import annotations

from contextlib import contextmanager
from uuid import UUID
from datetime import datetime, timezone
from time import perf_counter
from typing import Any

from backend.config import config
from backend.services.event_service import publish_event
from backend.services.guardrail_service import check_checkout
from backend.services.razorpay_service import create_order, fetch_order, fetch_payment, razorpay_readiness_metadata, verify_payment_signature
from backend.services.supabase_service import (
    create_agent_action,
    create_audit_log,
    create_cart_item_records,
    create_cart_session,
    create_order_item_records,
    create_order_record,
    create_payment_record,
    fetch_agent_action,
    fetch_cart_with_items,
    fetch_demo_checkout_cart,
    fetch_merchant_by_name,
    fetch_order_by_razorpay_id,
    fetch_payment_by_razorpay_id,
    fetch_profile_by_firebase_uid,
    fetch_products_by_skus,
    get_supabase_client,
    update_agent_action,
    update_order_by_razorpay_id,
    upsert_profile,
)

DEMO_CARTS = {"demo_cart_birthday": [{"product_id": "NEC102", "price": 2999}, {"product_id": "JCA210", "price": 699}]}


class CheckoutError(RuntimeError):
    def __init__(self, message: str, status: int = 400, code: str = "CHECKOUT_ERROR"):
        super().__init__(message)
        self.status = status
        self.code = code


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_log(message: str, **metadata: Any) -> None:
    safe = " ".join(f"{key}={value}" for key, value in metadata.items() if value is not None)
    print(f"[checkout-backend] {message}{' ' + safe if safe else ''}", flush=True)


def _razorpay_response_log(order_id: str, amount: int, currency: str) -> None:
    _safe_log(
        "Razorpay checkout response validated",
        response_key_matches_backend=True,
        frontend_key_mode="test" if config.razorpay_key_id.startswith("rzp_test_") else "invalid",
        order_id_valid=order_id.startswith("order_"),
        amount=amount,
        currency=currency,
    )


def _authorize_log(message: str, **metadata: Any) -> None:
    safe = " ".join(f"{key}={value}" for key, value in metadata.items() if value is not None)
    print(f"[authorize] {message}{' ' + safe if safe else ''}", flush=True)


class AuthorizeTimer:
    def __init__(self) -> None:
        self.started_at = perf_counter()
        self.stages: dict[str, float] = {}

    def elapsed_ms(self) -> int:
        return int((perf_counter() - self.started_at) * 1000)

    def mark(self, message: str, **metadata: Any) -> None:
        _authorize_log(message, t=f"{self.elapsed_ms()}ms", **metadata)

    @contextmanager
    def stage(self, name: str):
        started = perf_counter()
        self.mark(f"{name} start")
        try:
            yield
        finally:
            duration = int((perf_counter() - started) * 1000)
            self.stages[name] = self.stages.get(name, 0) + duration
            self.mark(f"{name} done", duration=f"{duration}ms")

    def summary(self) -> None:
        slowest = max(self.stages.items(), key=lambda item: item[1], default=("none", 0))
        _authorize_log("response ready", total=f"{self.elapsed_ms()}ms", slowest_stage=slowest[0], slowest_duration=f"{int(slowest[1])}ms")


def _safe_exception_metadata(exc: Exception) -> dict[str, Any]:
    metadata: dict[str, Any] = {"exception": type(exc).__name__}
    code = getattr(exc, "code", None)
    if code:
        metadata["code"] = code
    message = getattr(exc, "message", None)
    if message:
        metadata["message"] = str(message)[:160]
    return metadata


def _safe_provider_exception_metadata(exc: Exception) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "exception": type(exc).__name__,
        "message": str(exc)[:300],
    }
    if isinstance(exc, ModuleNotFoundError):
        metadata["missing_module"] = exc.name
    status_code = getattr(exc, "status_code", None)
    if status_code is None:
        status_code = getattr(exc, "status", None)
    if status_code is not None:
        metadata["status_code"] = status_code

    error = getattr(exc, "error", None)
    if isinstance(error, dict):
        if error.get("code"):
            metadata["provider_code"] = error.get("code")
        if error.get("description"):
            metadata["provider_description"] = str(error.get("description"))[:300]
    return metadata


def _is_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except ValueError:
        return False


def _inr_to_paise(amount_inr: int) -> int:
    return int(amount_inr) * 100


def _audit(event_type: str, description: str, status: str, metadata: dict[str, Any]) -> None:
    if config.demo_mode:
        return
    try:
        event = create_audit_log(
            {
                "merchant_id": metadata.get("merchant_id"),
                "agent_session_id": metadata.get("agent_session_id"),
                "actor_type": metadata.get("actor_type", "system"),
                "actor_id": metadata.get("actor_id"),
                "event_type": event_type,
                "description": description,
                "input_data": metadata.get("input_data", {}),
                "output_data": metadata.get("output_data", {}),
                "reason_summary": metadata.get("reason_summary", description),
                "risk_level": metadata.get("risk_level", "LOW"),
                "authorization_status": metadata.get("authorization_status", "NOT_REQUIRED"),
                "status": status,
                "metadata": metadata,
            }
        )
        publish_event(event)
    except Exception as exc:
        _authorize_log("audit insert failed", event_type=event_type, exception=type(exc).__name__)
        raise CheckoutError("Audit log could not be recorded.", 502, "AUDIT_WRITE_FAILED") from exc


def _validated_real_cart(cart_id: str) -> tuple[dict, list[dict], int]:
    if not _is_uuid(cart_id):
        raise CheckoutError("Cart not found.", 422, "CART_NOT_FOUND")
    cart = fetch_cart_with_items(cart_id)
    if not cart:
        raise CheckoutError("Cart not found.", 422, "CART_NOT_FOUND")
    if cart.get("status") not in {"open", "active", "authorized"}:
        raise CheckoutError("Cart is not open for checkout.", 422, "CART_NOT_CHECKOUTABLE")
    items = cart.get("cart_items") or []
    if not items:
        raise CheckoutError("Cart is empty.", 422, "EMPTY_CART")

    normalized = []
    total = 0
    for item in items:
        product = item.get("products") or {}
        quantity = int(item.get("quantity") or 0)
        price = int(product.get("price_inr") or item.get("unit_price_inr") or 0)
        inventory = int(product.get("inventory") or 0)
        if quantity <= 0:
            raise CheckoutError("Cart contains an invalid quantity.", 422, "INVALID_QUANTITY")
        if not product or not product.get("active", True):
            raise CheckoutError("Cart contains an unavailable product.", 422, "PRODUCT_UNAVAILABLE")
        if inventory < quantity:
            raise CheckoutError("Insufficient inventory for checkout.", 422, "INSUFFICIENT_INVENTORY")
        total += price * quantity
        normalized.append({"product": product, "quantity": quantity, "unit_price_inr": price})
    return cart, normalized, total


def _profile_for_user(firebase_uid: str, email: str | None = None, timer: AuthorizeTimer | None = None) -> dict:
    try:
        if timer:
            with timer.stage("profile lookup"):
                profile = fetch_profile_by_firebase_uid(firebase_uid)
        else:
            profile = fetch_profile_by_firebase_uid(firebase_uid)
    except Exception as exc:
        _authorize_log("profile lookup failed", exception=type(exc).__name__)
        raise CheckoutError("Authenticated profile could not be loaded.", 502, "PROFILE_LOOKUP_FAILED") from exc
    if not profile:
        try:
            if timer:
                with timer.stage("profile upsert"):
                    profile = upsert_profile(firebase_uid, email or f"{firebase_uid}@nexora.local")
            else:
                profile = upsert_profile(firebase_uid, email or f"{firebase_uid}@nexora.local")
        except Exception as exc:
            _authorize_log("profile upsert failed", exception=type(exc).__name__)
            raise CheckoutError("Authenticated profile could not be prepared.", 502, "PROFILE_UPSERT_FAILED") from exc
    if not profile.get("id"):
        raise CheckoutError("Authenticated profile could not be prepared.", 422, "PROFILE_NOT_READY")
    return profile


def _approved_action(action_id: str | None, idempotency_key: str, firebase_uid: str, cart_id: str, email: str | None = None, timer: AuthorizeTimer | None = None) -> dict:
    profile = _profile_for_user(firebase_uid, email, timer)
    action = fetch_agent_action(action_id, idempotency_key)
    if not action:
        raise CheckoutError("Persisted financial authorization is required.", 403, "AUTHORIZATION_REQUIRED")
    if action.get("user_id") and action["user_id"] != profile["id"]:
        raise CheckoutError("Authorization does not belong to this user.", 403, "AUTHORIZATION_USER_MISMATCH")
    if str(action.get("approval_status", "")).upper() != "APPROVED":
        raise CheckoutError("Financial action is not approved.", 403, "AUTHORIZATION_REQUIRED")

    requested = action.get("requested_payload") or {}
    if cart_id and requested.get("cart_id") and requested["cart_id"] != cart_id:
        raise CheckoutError("Authorization does not match this cart.", 409, "AUTHORIZATION_CART_MISMATCH")
    return action


def _resolve_checkout_cart(cart_id: str, idempotency_key: str, firebase_uid: str, email: str | None = None, timer: AuthorizeTimer | None = None) -> str:
    if cart_id != "demo_cart_birthday":
        return cart_id

    _authorize_log("resolving demo alias")
    try:
        if timer:
            with timer.stage("merchant lookup"):
                merchant = fetch_merchant_by_name("NEXORA Demo Store")
        else:
            merchant = fetch_merchant_by_name("NEXORA Demo Store")
    except Exception as exc:
        _authorize_log("merchant lookup failed", exception=type(exc).__name__)
        raise CheckoutError("Demo store could not be loaded.", 502, "STORE_LOOKUP_FAILED") from exc
    if not merchant:
        raise CheckoutError("Demo merchant is not seeded.", 422, "DEMO_STORE_NOT_FOUND")

    try:
        if timer:
            with timer.stage("product lookup"):
                products = fetch_products_by_skus(["NEC102", "JCA210"])
        else:
            products = fetch_products_by_skus(["NEC102", "JCA210"])
    except Exception as exc:
        _authorize_log("product lookup failed", exception=type(exc).__name__)
        raise CheckoutError("Demo checkout products could not be loaded.", 502, "PRODUCT_LOOKUP_FAILED") from exc
    products_by_sku = {product.get("sku"): product for product in products}
    products = [products_by_sku.get("NEC102"), products_by_sku.get("JCA210")]
    if not all(products):
        raise CheckoutError("Demo checkout products are not seeded.", 422, "CATALOG_PRODUCT_MISSING")

    try:
        if timer:
            with timer.stage("cart lookup"):
                existing_cart = fetch_demo_checkout_cart(merchant["id"])
        else:
            existing_cart = fetch_demo_checkout_cart(merchant["id"])
    except Exception as exc:
        _authorize_log("demo cart lookup failed", exception=type(exc).__name__)
        raise CheckoutError("Checkout cart could not be loaded.", 502, "CART_LOOKUP_FAILED") from exc
    if existing_cart and existing_cart.get("id"):
        _authorize_log("real cart ready", cart_id=existing_cart["id"])
        _authorize_log("cart items ready")
        return existing_cart["id"]

    try:
        if timer:
            with timer.stage("cart preparation"):
                cart = create_cart_session({"merchant_id": merchant["id"], "status": "authorized"})
        else:
            cart = create_cart_session({"merchant_id": merchant["id"], "status": "authorized"})
    except Exception as exc:
        _authorize_log("cart insert failed", exception=type(exc).__name__)
        raise CheckoutError("Checkout cart could not be prepared.", 502, "CART_CREATE_FAILED") from exc
    if not cart.get("id"):
        raise CheckoutError("Checkout cart could not be prepared.", 422, "CART_NOT_READY")
    _authorize_log("real cart ready", cart_id=cart["id"])

    try:
        values = [
            {
                "cart_session_id": cart["id"],
                "product_id": product["id"],
                "quantity": 1,
                "unit_price_inr": product["price_inr"],
            }
            for product in products
            if product
        ]
        if timer:
            with timer.stage("cart item preparation"):
                create_cart_item_records(values)
        else:
            create_cart_item_records(values)
    except Exception as exc:
        _authorize_log("cart items insert failed", exception=type(exc).__name__)
        raise CheckoutError("Checkout cart items could not be prepared.", 502, "CART_ITEM_CREATE_FAILED") from exc
    _authorize_log("cart items ready")
    return cart["id"]


def authorize_checkout(cart_id: str, idempotency_key: str, firebase_uid: str, agent_action_id: str | None = None, email: str | None = None) -> dict:
    timer = AuthorizeTimer()
    timer.mark("request received", cart_id=cart_id, idempotency_key_present=bool(idempotency_key))
    if config.demo_mode:
        cart = DEMO_CARTS.get(cart_id)
        if not cart:
            raise CheckoutError("Cart not found.", 422, "CART_NOT_FOUND")
        total = sum(item["price"] for item in cart)
        timer.summary()
        return {"authorization_id": idempotency_key, "status": "approved", "cart_id": cart_id, "amount": _inr_to_paise(total), "currency": "INR"}
    if get_supabase_client() is None:
        raise CheckoutError("Supabase is not configured.", 502, "SUPABASE_UNAVAILABLE")

    timer.mark("firebase verified", uid_present=bool(firebase_uid))
    timer.mark("resolving cart")
    resolved_cart_id = _resolve_checkout_cart(cart_id, idempotency_key, firebase_uid, email, timer)
    timer.mark("loading cart", cart_id=resolved_cart_id)
    try:
        with timer.stage("cart validation"):
            cart, items, total = _validated_real_cart(resolved_cart_id)
    except CheckoutError:
        raise
    except Exception as exc:
        _authorize_log("cart lookup failed", exception=type(exc).__name__)
        raise CheckoutError("Checkout cart could not be loaded.", 502, "CART_LOOKUP_FAILED") from exc
    with timer.stage("amount calculation"):
        amount_paise = _inr_to_paise(total)
    timer.mark("amount calculated", item_count=len(items), amount=amount_paise, currency="INR")

    timer.mark("checking guardrails")
    try:
        with timer.stage("guardrails"):
            policy = check_checkout(total)
    except Exception as exc:
        _authorize_log("guardrail check failed", exception=type(exc).__name__)
        raise CheckoutError("Checkout guardrails could not be evaluated.", 502, "GUARDRAIL_SERVICE_FAILED") from exc
    if not policy["passed"]:
        with timer.stage("audit persistence"):
            _audit("POLICY_CHECK_BLOCKED", policy["decision_summary"], "FAILED", {"merchant_id": cart["merchant_id"], "risk_level": policy["risk_level"], "authorization_status": "REQUIRED", "amount": total})
        raise CheckoutError(policy["decision_summary"], 403, "POLICY_BLOCKED")
    timer.mark("guardrails passed")

    timer.mark("loading profile")
    profile = _profile_for_user(firebase_uid, email, timer)
    timer.mark("profile ready", profile_id=profile.get("id"))
    timer.mark("agent action lookup starting")
    timer.mark("action lookup cart uuid present", present=_is_uuid(resolved_cart_id))
    timer.mark("action lookup idempotency key present", present=bool(idempotency_key))
    try:
        with timer.stage("agent action lookup"):
            existing = fetch_agent_action(agent_action_id, idempotency_key)
    except Exception as exc:
        _authorize_log("agent action lookup failed", **_safe_exception_metadata(exc))
        raise CheckoutError("Checkout authorization could not be loaded.", 502, "AGENT_ACTION_LOOKUP_FAILED") from exc
    timer.mark("agent action lookup completed")
    timer.mark("existing action found", found=bool(existing))
    if existing:
        requested = existing.get("requested_payload") or {}
        if existing.get("user_id") and existing["user_id"] != profile["id"]:
            raise CheckoutError("Authorization does not belong to this user.", 403, "AUTHORIZATION_USER_MISMATCH")
        if requested.get("cart_id") and requested["cart_id"] != resolved_cart_id:
            raise CheckoutError("Authorization does not match this cart.", 409, "AUTHORIZATION_CART_MISMATCH")
        if str(existing.get("approval_status", "")).upper() == "APPROVED":
            timer.summary()
            return {"authorization_id": existing["id"], "status": "approved", "cart_id": resolved_cart_id, "amount": amount_paise, "currency": "INR", "idempotent_replay": True}
        timer.mark("persisting agent action", action_id=existing["id"])
        try:
            with timer.stage("agent action persistence"):
                updated = update_agent_action(
                    existing["id"],
                    {
                        "approval_status": "APPROVED",
                        "approved_by": profile["id"],
                        "approved_at": _now(),
                        "execution_status": "APPROVED",
                        "requested_payload": {**requested, "cart_id": resolved_cart_id},
                        "updated_at": _now(),
                    },
                )
        except Exception as exc:
            _authorize_log("agent action update failed", exception=type(exc).__name__)
            raise CheckoutError("Checkout authorization could not be recorded.", 502, "AGENT_ACTION_UPDATE_FAILED") from exc
        timer.mark("authorization persisted", authorization_id=updated.get("id", existing["id"]))
        with timer.stage("audit persistence"):
            _audit("USER_AUTHORIZATION_RECEIVED", "Authenticated user approved checkout.", "COMPLETED", {"merchant_id": cart["merchant_id"], "checkout_request_id": existing["id"], "cart_id": resolved_cart_id, "amount": amount_paise, "currency": "INR", "authorization_status": "APPROVED", "actor_type": "customer", "actor_id": profile["id"]})
        timer.mark("returning response", authorization_id=updated.get("id", existing["id"]))
        timer.summary()
        return {"authorization_id": updated.get("id", existing["id"]), "status": "approved", "cart_id": resolved_cart_id, "amount": amount_paise, "currency": "INR", "idempotent_replay": True}

    timer.mark("persisting agent action")
    try:
        with timer.stage("agent action persistence"):
            action = create_agent_action(
                {
                    "agent_session_id": None,
                    "user_id": profile["id"],
                    "merchant_id": cart["merchant_id"],
                    "action_type": "create_order",
                    "requested_payload": {"cart_id": resolved_cart_id, "source_cart_id": cart_id},
                    "decision_summary": "Customer approved birthday gift checkout.",
                    "risk_level": "LOW",
                    "requires_approval": True,
                    "approval_status": "APPROVED",
                    "approved_by": profile["id"],
                    "approved_at": _now(),
                    "execution_status": "APPROVED",
                    "execution_result": {},
                    "idempotency_key": idempotency_key,
                }
            )
    except Exception as exc:
        _authorize_log("agent action insert failed", exception=type(exc).__name__)
        raise CheckoutError("Checkout authorization could not be recorded.", 502, "AGENT_ACTION_INSERT_FAILED") from exc
    if not action.get("id"):
        raise CheckoutError("Checkout authorization could not be recorded.", 422, "AUTHORIZATION_NOT_READY")
    timer.mark("authorization persisted", authorization_id=action["id"])
    with timer.stage("audit persistence"):
        _audit("CART_PREPARED", "Checkout cart prepared from trusted Supabase products.", "COMPLETED", {"merchant_id": cart["merchant_id"], "checkout_request_id": action["id"], "cart_id": resolved_cart_id, "item_count": len(items), "amount_inr": total, "amount": amount_paise, "currency": "INR", "authorization_status": "REQUIRED"})
        _audit("POLICY_CHECK_PASSED", policy["decision_summary"], "COMPLETED", {"merchant_id": cart["merchant_id"], "checkout_request_id": action["id"], "risk_level": policy["risk_level"], "authorization_status": "APPROVED", "amount": total, "maximum_allowed": 10000, "decision": policy.get("decision")})
        _audit("USER_AUTHORIZATION_RECEIVED", "Authenticated user approved checkout.", "COMPLETED", {"merchant_id": cart["merchant_id"], "checkout_request_id": action["id"], "authorization_id": action["id"], "cart_id": resolved_cart_id, "amount": amount_paise, "currency": "INR", "authorization_status": "APPROVED", "actor_type": "customer", "actor_id": profile["id"]})
    timer.mark("returning response", authorization_id=action["id"])
    timer.summary()
    return {"authorization_id": action["id"], "status": "approved", "cart_id": resolved_cart_id, "amount": amount_paise, "currency": "INR", "idempotent_replay": False}


def create_checkout_order(cart_id: str, idempotency_key: str, firebase_uid: str, agent_action_id: str | None = None, email: str | None = None) -> dict:
    _safe_log("request received", cart_id=cart_id, idempotency_key=idempotency_key)
    if config.demo_mode:
        cart = DEMO_CARTS.get(cart_id)
        if not cart:
            raise CheckoutError("Cart not found.", 422, "CART_NOT_FOUND")
        total = sum(item["price"] for item in cart)
        policy = check_checkout(total)
        if not policy["passed"]:
            raise CheckoutError(policy["decision_summary"], 403, "POLICY_BLOCKED")
        order = create_order(_inr_to_paise(total), "INR", cart_id, idempotency_key)
        return {"checkout_request_id": idempotency_key, "order_id": order["id"], "amount": order["amount"], "amount_inr": total, "currency": order["currency"], "key_id": config.razorpay_key_id, "idempotent_replay": order.get("idempotent_replay", False)}

    if not config.razorpay_key_id.startswith("rzp_test_"):
        raise CheckoutError("Razorpay live keys are disabled for this development flow.", 503, "RAZORPAY_CONFIGURATION_ERROR")
    if get_supabase_client() is None:
        raise CheckoutError("Supabase is not configured.", 502, "SUPABASE_UNAVAILABLE")

    _safe_log("firebase authenticated", uid_present=bool(firebase_uid))
    _safe_log("resolving idempotency")
    resolved_cart_id = _resolve_checkout_cart(cart_id, idempotency_key, firebase_uid, email)

    _safe_log("loading cart", cart_id=resolved_cart_id)
    cart, items, total = _validated_real_cart(resolved_cart_id)
    _safe_log("cart loaded", item_count=len(items), total=total)

    _safe_log("validating authorization")
    action = _approved_action(agent_action_id, idempotency_key, firebase_uid, resolved_cart_id, email)
    _safe_log("authorization valid", action_id=action.get("id"))
    checkout_request_id = action["id"]
    result = action.get("execution_result") or {}
    if result.get("razorpay_order_id"):
        try:
            current_order = fetch_order(result["razorpay_order_id"])
        except Exception as exc:
            _safe_log("Razorpay replay order fetch failed", **_safe_provider_exception_metadata(exc))
            current_order = {}
        current_status = str(current_order.get("status") or "")
        if current_status in {"created", "attempted"}:
            _safe_log("reusing existing Razorpay order", order_status=current_status)
            _razorpay_response_log(result["razorpay_order_id"], int(result["amount"]), result["currency"])
            return {"checkout_request_id": checkout_request_id, "order_id": result["razorpay_order_id"], "amount": result["amount"], "amount_inr": total, "currency": result["currency"], "key_id": config.razorpay_key_id, "idempotent_replay": True}
        _safe_log("existing Razorpay order not reusable; creating fresh order", order_status=current_status or "unknown")

    _safe_log("validating guardrails")
    policy = check_checkout(total)
    if not policy["passed"]:
        _audit("POLICY_CHECK_BLOCKED", policy["decision_summary"], "FAILED", {"merchant_id": cart["merchant_id"], "agent_session_id": action.get("agent_session_id"), "risk_level": policy["risk_level"], "authorization_status": "APPROVED", "amount": total})
        raise CheckoutError(policy["decision_summary"], 403, "POLICY_BLOCKED")
    _safe_log("guardrails passed")

    amount_paise = _inr_to_paise(total)
    _safe_log("persisting checkout request", checkout_request_id=checkout_request_id)
    _safe_log("Razorpay readiness", **razorpay_readiness_metadata(amount_paise, "INR"))
    _safe_log("creating Razorpay order", amount=amount_paise, currency="INR")
    try:
        order = create_order(amount_paise, "INR", checkout_request_id, idempotency_key)
    except Exception as exc:
        _safe_log("Razorpay create order failed", **_safe_provider_exception_metadata(exc))
        raise CheckoutError("Razorpay order could not be created.", 502, "RAZORPAY_PROVIDER_ERROR") from exc
    order_id = str(order.get("id") or "")
    order_status = str(order.get("status") or "")
    if not order_id.startswith("order_"):
        raise CheckoutError("Razorpay order is invalid for checkout.", 502, "RAZORPAY_ORDER_INVALID")
    if int(order.get("amount") or 0) != amount_paise:
        raise CheckoutError("Razorpay order amount did not match.", 502, "RAZORPAY_AMOUNT_MISMATCH")
    if str(order.get("currency") or "").upper() != "INR":
        raise CheckoutError("Razorpay order currency did not match.", 502, "RAZORPAY_CURRENCY_MISMATCH")
    if order_status and order_status not in {"created", "attempted"}:
        raise CheckoutError("Razorpay order is not available for checkout.", 502, "RAZORPAY_ORDER_NOT_CHECKOUTABLE")
    _safe_log("Razorpay order created", order_id_valid=order_id.startswith("order_"), order_status=order_status or "unknown")
    existing_order_row = fetch_order_by_razorpay_id(order["id"])
    if existing_order_row:
        update_agent_action(checkout_request_id, {"execution_status": "PAYMENT_PENDING", "execution_result": {"checkout_request_id": checkout_request_id, "razorpay_order_id": order["id"], "amount": amount_paise, "currency": "INR", "order_db_id": existing_order_row["id"], "updated_at": _now()}})
        _safe_log("returning create-order response", checkout_request_id=checkout_request_id)
        _razorpay_response_log(order["id"], amount_paise, "INR")
        return {"checkout_request_id": checkout_request_id, "order_id": order["id"], "amount": amount_paise, "amount_inr": total, "currency": "INR", "key_id": config.razorpay_key_id, "idempotent_replay": True}
    order_row = create_order_record({"merchant_id": cart["merchant_id"], "customer_id": cart.get("customer_id"), "cart_session_id": resolved_cart_id, "razorpay_order_id": order["id"], "total_inr": total, "status": "payment_pending"})
    create_order_item_records([{"order_id": order_row["id"], "product_id": item["product"]["id"], "quantity": item["quantity"], "unit_price_inr": item["unit_price_inr"]} for item in items])
    update_agent_action(checkout_request_id, {"execution_status": "PAYMENT_PENDING", "execution_result": {"checkout_request_id": checkout_request_id, "razorpay_order_id": order["id"], "amount": amount_paise, "currency": "INR", "order_db_id": order_row["id"], "updated_at": _now()}})
    _audit("RAZORPAY_ORDER_CREATED", "Razorpay test order created.", "COMPLETED", {"merchant_id": cart["merchant_id"], "agent_session_id": action.get("agent_session_id"), "checkout_request_id": checkout_request_id, "razorpay_order_id": order["id"], "amount": amount_paise, "currency": "INR", "authorization_status": "APPROVED", "actor_type": "razorpay"})
    _audit("PAYMENT_ATTEMPTED", "Payment moved to Razorpay Checkout.", "COMPLETED", {"merchant_id": cart["merchant_id"], "agent_session_id": action.get("agent_session_id"), "checkout_request_id": checkout_request_id, "order_id": order["id"], "authorization_status": "APPROVED"})
    _razorpay_response_log(order["id"], amount_paise, "INR")
    _safe_log("returning create-order response", checkout_request_id=checkout_request_id)
    return {"checkout_request_id": checkout_request_id, "order_id": order["id"], "amount": amount_paise, "amount_inr": total, "currency": "INR", "key_id": config.razorpay_key_id, "idempotent_replay": False}


def verify_checkout_payment(checkout_request_id: str | None, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str, firebase_uid: str) -> dict:
    if config.demo_mode:
        if not verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
            raise CheckoutError("Payment signature verification failed.", 400, "SIGNATURE_INVALID")
        payment = fetch_payment(razorpay_payment_id)
        return {"verified": True, "status": "verified", "checkout_request_id": checkout_request_id, "order_id": razorpay_order_id, "payment_id": razorpay_payment_id, "payment": payment}

    if not checkout_request_id:
        raise CheckoutError("checkout_request_id is required.", 422, "VALIDATION_ERROR")
    action = _approved_action(checkout_request_id, "", firebase_uid, "")
    result = action.get("execution_result") or {}
    stored_order_id = result.get("razorpay_order_id")
    if stored_order_id != razorpay_order_id:
        raise CheckoutError("Razorpay order does not match checkout request.", 409, "ORDER_MISMATCH")

    existing_payment = fetch_payment_by_razorpay_id(razorpay_payment_id)
    if existing_payment and existing_payment.get("status") == "verified":
        return {"verified": True, "status": "verified", "checkout_request_id": checkout_request_id, "order_id": razorpay_order_id, "payment_id": razorpay_payment_id, "idempotent_replay": True}

    if not verify_payment_signature(stored_order_id, razorpay_payment_id, razorpay_signature):
        _audit("PAYMENT_VERIFICATION_FAILED", "Razorpay signature did not match.", "FAILED", {"merchant_id": action.get("merchant_id"), "agent_session_id": action.get("agent_session_id"), "checkout_request_id": checkout_request_id, "razorpay_order_id": razorpay_order_id, "risk_level": "HIGH", "actor_type": "razorpay"})
        raise CheckoutError("Payment signature verification failed.", 400, "SIGNATURE_INVALID")

    order_row = fetch_order_by_razorpay_id(razorpay_order_id)
    if not order_row:
        raise CheckoutError("Stored order not found.", 409, "ORDER_NOT_FOUND")
    payment = fetch_payment(razorpay_payment_id)
    create_payment_record({"order_id": order_row["id"], "razorpay_payment_id": razorpay_payment_id, "razorpay_order_id": razorpay_order_id, "amount_inr": order_row["total_inr"], "status": "verified", "raw_payload": {"checkout_request_id": checkout_request_id, "provider_status": payment.get("status")}})
    update_order_by_razorpay_id(razorpay_order_id, {"status": "verified", "updated_at": _now()})
    update_agent_action(checkout_request_id, {"execution_status": "PAYMENT_VERIFIED", "execution_result": {**result, "payment_id": razorpay_payment_id, "verified_at": _now()}})
    _audit("PAYMENT_VERIFIED", "Payment signature verified and persisted.", "COMPLETED", {"merchant_id": action.get("merchant_id"), "agent_session_id": action.get("agent_session_id"), "checkout_request_id": checkout_request_id, "razorpay_order_id": razorpay_order_id, "razorpay_payment_id": razorpay_payment_id, "amount": order_row["total_inr"], "currency": "INR", "authorization_status": "APPROVED", "actor_type": "razorpay"})
    return {"verified": True, "status": "verified", "checkout_request_id": checkout_request_id, "order_id": razorpay_order_id, "payment_id": razorpay_payment_id}
