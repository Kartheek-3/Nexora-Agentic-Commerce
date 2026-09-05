from __future__ import annotations

from datetime import datetime, timezone

from backend.config import config

_supabase_client = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_supabase_client():
    global _supabase_client
    if not (config.supabase_url and config.supabase_service_role_key):
        return None
    if _supabase_client is not None:
        return _supabase_client
    from supabase import create_client

    _supabase_client = create_client(config.supabase_url, config.supabase_service_role_key)
    return _supabase_client


def check_supabase_connection() -> bool:
    client = get_supabase_client()
    if client is None:
        return False
    try:
        client.table("products").select("id").limit(1).execute()
        return True
    except Exception:
        return False


def fetch_products(limit: int = 48) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("products").select("*").eq("active", True).limit(limit).execute()
    return response.data or []


def search_products(
    query: str = "",
    max_price: int | None = None,
    category: str | None = None,
    merchant_id: str | None = None,
    available: bool = True,
    page: int = 1,
    page_size: int = 24,
) -> dict:
    client = get_supabase_client()
    if client is None:
        return {"items": [], "total": 0}
    offset = max(page - 1, 0) * page_size
    fields = "*, merchants(name)"
    request = client.table("products").select(fields, count="exact")
    if available:
        request = request.eq("active", True).gt("inventory", 0)
    if max_price is not None:
        request = request.lte("price_inr", max_price)
    if category:
        request = request.eq("category", category)
    if merchant_id:
        request = request.eq("merchant_id", merchant_id)
    if query:
        pattern = f"%{query}%"
        request = request.or_(f"name.ilike.{pattern},description.ilike.{pattern},category.ilike.{pattern},sku.ilike.{pattern}")
    response = request.order("inventory", desc=True).range(offset, offset + page_size - 1).execute()
    return {"items": response.data or [], "total": response.count or 0}


def fetch_merchant_guardrails() -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("merchant_guardrails").select("*").limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_profile_by_firebase_uid(firebase_uid: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("profiles").select("*").eq("firebase_uid", firebase_uid).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def upsert_profile(firebase_uid: str, email: str, display_name: str | None = None) -> dict:
    client = get_supabase_client()
    response = (
        client.table("profiles")
        .upsert({"firebase_uid": firebase_uid, "email": email, "display_name": display_name}, on_conflict="firebase_uid")
        .execute()
    )
    return (response.data or [{}])[0]


def fetch_merchant_by_name(name: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("merchants").select("*").eq("name", name).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def create_agent_session(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("agent_sessions").insert(values).execute()
    return (response.data or [{}])[0]


def fetch_agent_session(session_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("agent_sessions").select("*").eq("id", session_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def create_recommendation(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("recommendations").insert(values).execute()
    return (response.data or [{}])[0]


def fetch_recommendation(recommendation_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("recommendations").select("*, products(*)").eq("id", recommendation_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def accept_recommendation(recommendation_id: str, accepted_price_inr: int) -> dict:
    client = get_supabase_client()
    response = (
        client.table("recommendations")
        .update({"status": "accepted", "accepted_at": _now(), "accepted_price_inr": accepted_price_inr})
        .eq("id", recommendation_id)
        .in_("status", ["proposed", "accepted"])
        .execute()
    )
    return (response.data or [{}])[0]


def decline_recommendation(recommendation_id: str) -> dict:
    client = get_supabase_client()
    response = client.table("recommendations").update({"status": "declined"}).eq("id", recommendation_id).eq("status", "proposed").execute()
    return (response.data or [{}])[0]


def fetch_accepted_recommendations_for_session(agent_session_id: str) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = (
        client.table("recommendations")
        .select("*")
        .eq("agent_session_id", agent_session_id)
        .eq("recommendation_type", "cross_sell")
        .eq("status", "accepted")
        .execute()
    )
    return response.data or []


def mark_recommendation_realized(recommendation_id: str, order_id: str, payment_id: str, revenue_inr: int) -> dict:
    client = get_supabase_client()
    response = (
        client.table("recommendations")
        .update({"status": "realized", "realized_order_id": order_id, "realized_payment_id": payment_id, "realized_revenue_inr": revenue_inr})
        .eq("id", recommendation_id)
        .eq("status", "accepted")
        .execute()
    )
    return (response.data or [{}])[0]


def fetch_realized_upsells(limit: int = 1000) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("recommendations").select("*").eq("recommendation_type", "cross_sell").eq("status", "realized").limit(limit).execute()
    return response.data or []


def fetch_product_by_sku(sku: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("products").select("*").eq("sku", sku).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_products_by_skus(skus: list[str]) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("products").select("*").in_("sku", skus).execute()
    return response.data or []


def fetch_demo_checkout_cart(merchant_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = (
        client.table("cart_sessions")
        .select("*, cart_items(*, products(*))")
        .eq("merchant_id", merchant_id)
        .eq("status", "authorized")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    expected = {"NEC102", "JCA210"}
    for cart in response.data or []:
        skus = {item.get("products", {}).get("sku") for item in cart.get("cart_items") or []}
        if skus == expected:
            return cart
    return None


def fetch_cart_with_items(cart_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = (
        client.table("cart_sessions")
        .select("*, cart_items(*, products(*))")
        .eq("id", cart_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def fetch_agent_action(action_id: str | None = None, idempotency_key: str | None = None) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    query = client.table("agent_actions").select("*")
    if action_id:
        query = query.eq("id", action_id)
    elif idempotency_key:
        query = query.eq("idempotency_key", idempotency_key)
    else:
        return None
    response = query.limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_agent_action_by_razorpay_order(razorpay_order_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("agent_actions").select("*").filter("execution_result->>razorpay_order_id", "eq", razorpay_order_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def create_cart_session(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("cart_sessions").insert(values).execute()
    return (response.data or [{}])[0]


def create_cart_item_records(values: list[dict]) -> list[dict]:
    if not values:
        return []
    client = get_supabase_client()
    response = client.table("cart_items").insert(values).execute()
    return response.data or []


def create_agent_action(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("agent_actions").insert(values).execute()
    return (response.data or [{}])[0]


def update_agent_action(action_id: str, values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("agent_actions").update(values).eq("id", action_id).execute()
    return (response.data or [{}])[0]


def create_order_record(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("orders").insert(values).execute()
    return (response.data or [{}])[0]


def update_order_by_razorpay_id(razorpay_order_id: str, values: dict) -> dict | None:
    client = get_supabase_client()
    response = client.table("orders").update(values).eq("razorpay_order_id", razorpay_order_id).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_order_by_razorpay_id(razorpay_order_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("orders").select("*").eq("razorpay_order_id", razorpay_order_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_payment_by_razorpay_id(razorpay_payment_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("payments").select("*").eq("razorpay_payment_id", razorpay_payment_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def create_payment_record(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("payments").insert(values).execute()
    return (response.data or [{}])[0]


def create_order_item_records(values: list[dict]) -> list[dict]:
    if not values:
        return []
    client = get_supabase_client()
    response = client.table("order_items").insert(values).execute()
    return response.data or []


def fetch_order_items(order_id: str) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("order_items").select("*").eq("order_id", order_id).execute()
    return response.data or []


def create_audit_log(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("audit_logs").insert(values).execute()
    return (response.data or [{}])[0]


def fetch_audit_logs(limit: int = 50) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("audit_logs").select("*").order("created_at", desc=True).limit(limit).execute()
    return response.data or []


def fetch_audit_logs_by_session(session_id: str) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = (
        client.table("audit_logs")
        .select("*")
        .filter("metadata->>session_id", "eq", session_id)
        .order("created_at")
        .limit(100)
        .execute()
    )
    return response.data or []


def fetch_agent_sessions_count() -> int:
    client = get_supabase_client()
    if client is None:
        return 0
    response = client.table("agent_sessions").select("id", count="exact").limit(1).execute()
    return response.count or 0


def fetch_verified_payments(limit: int = 1000) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("payments").select("*, orders(*)").eq("status", "verified").limit(limit).execute()
    return response.data or []


def fetch_agent_payment_links(limit: int = 1000) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = (
        client.table("agent_actions")
        .select("id, agent_session_id, merchant_id, execution_result")
        .filter("agent_session_id", "not.is", "null")
        .limit(limit)
        .execute()
    )
    return response.data or []


def fetch_agent_verified_payment_events(limit: int = 1000) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = (
        client.table("audit_logs")
        .select("agent_session_id, merchant_id, metadata")
        .eq("event_type", "PAYMENT_VERIFIED")
        .filter("agent_session_id", "not.is", "null")
        .limit(limit)
        .execute()
    )
    return response.data or []


def create_recovery_attempt(values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("recovery_attempts").insert(values).execute()
    return (response.data or [{}])[0]


def fetch_recovery_by_original_order(order_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("recovery_attempts").select("*").eq("original_order_id", order_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_pending_recovery_for_cart(cart_session_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("recovery_attempts").select("*").eq("cart_session_id", cart_session_id).eq("status", "pending").order("created_at", desc=True).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def complete_recovery_attempt(recovery_id: str, values: dict) -> dict:
    client = get_supabase_client()
    response = client.table("recovery_attempts").update({"status": "completed", **values}).eq("id", recovery_id).eq("status", "pending").execute()
    return (response.data or [{}])[0]


def fetch_completed_recoveries(limit: int = 1000) -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("recovery_attempts").select("*").eq("status", "completed").limit(limit).execute()
    return response.data or []


def create_checkout_funnel(values: dict) -> dict:
    client = get_supabase_client()
    existing = fetch_checkout_funnel(values["funnel_key"])
    if existing:
        return existing
    response = client.table("checkout_funnel_sessions").insert(values).execute()
    return (response.data or [{}])[0]


def fetch_checkout_funnel(funnel_key: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("checkout_funnel_sessions").select("*").eq("funnel_key", funnel_key).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def fetch_checkout_funnel_by_id(funnel_id: str) -> dict | None:
    client = get_supabase_client()
    if client is None:
        return None
    response = client.table("checkout_funnel_sessions").select("*").eq("id", funnel_id).limit(1).execute()
    rows = response.data or []
    return rows[0] if rows else None


def convert_checkout_funnel(funnel_id: str) -> dict:
    client = get_supabase_client()
    response = client.table("checkout_funnel_sessions").update({"status": "converted", "converted_at": _now()}).eq("id", funnel_id).neq("status", "converted").execute()
    return (response.data or [{}])[0]


def abandon_checkout_funnel(funnel_id: str) -> dict:
    client = get_supabase_client()
    response = client.table("checkout_funnel_sessions").update({"status": "abandoned", "abandoned_at": _now()}).eq("id", funnel_id).eq("status", "started").execute()
    return (response.data or [{}])[0]


def fetch_checkout_funnel_stats() -> list[dict]:
    client = get_supabase_client()
    if client is None:
        return []
    response = client.table("checkout_funnel_sessions").select("channel,status").execute()
    return response.data or []
