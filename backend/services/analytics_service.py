from __future__ import annotations

from backend.config import config
from backend.services.supabase_service import fetch_agent_payment_links, fetch_agent_sessions_count, fetch_agent_verified_payment_events, fetch_verified_payments


def _demo_metrics() -> dict:
    return {
        "ai_assisted_revenue": 184230,
        "verified_transactions": 132,
        "agent_conversion_rate": 15.58,
        "conversion_rate": 15.58,
        "conversion_lift": 21.4,
        "baseline_conversion_rate": None,
        "average_order_value": 3698,
        "upsell_revenue": 29840,
        "upsell_transactions": 0,
        "recovered_revenue": 41200,
        "recovered_transactions": 0,
        "agent_sessions": 847,
        "transactions": 132,
    }


def _payment_order(payment: dict) -> dict:
    order = payment.get("orders")
    return order if isinstance(order, dict) else {}


def _payment_amount_inr(payment: dict) -> int:
    return int(payment.get("amount_inr") or _payment_order(payment).get("total_inr") or 0)


def _payment_merchant_id(payment: dict) -> str | None:
    merchant_id = _payment_order(payment).get("merchant_id")
    return str(merchant_id) if merchant_id else None


def _payment_identifiers(payment: dict) -> set[str]:
    identifiers = {payment.get("razorpay_order_id"), payment.get("razorpay_payment_id")}
    return {str(value) for value in identifiers if value}


def _agent_linked_payment_ids() -> set[str]:
    linked: set[str] = set()
    for action in fetch_agent_payment_links():
        result = action.get("execution_result") or {}
        if not isinstance(result, dict):
            continue
        for key in ("razorpay_order_id", "razorpay_payment_id", "order_id"):
            value = result.get(key)
            if value:
                linked.add(str(value))
    for event in fetch_agent_verified_payment_events():
        metadata = event.get("metadata") or {}
        if not isinstance(metadata, dict):
            continue
        for key in ("razorpay_order_id", "razorpay_payment_id", "order_id"):
            value = metadata.get(key)
            if value:
                linked.add(str(value))
    return linked


def merchant_metrics() -> dict:
    if config.demo_mode:
        return {
            **_demo_metrics(),
            "mode": "demo",
            "conversion_lift_label": "+21.4%",
            "upsell_revenue_label": "Attributed cross-sell purchases.",
            "recovered_revenue_label": "Recovered checkout revenue.",
        }

    payments = fetch_verified_payments()
    agent_linked_ids = _agent_linked_payment_ids()
    agent_payments = [payment for payment in payments if _payment_identifiers(payment) & agent_linked_ids]
    revenue = sum(_payment_amount_inr(payment) for payment in agent_payments)
    transactions = len(agent_payments)
    verified_transactions = len(payments)
    sessions = fetch_agent_sessions_count()
    agent_conversion_rate = round((transactions / sessions) * 100, 2) if sessions else None
    average_order_value = round(revenue / transactions) if transactions else 0
    return {
        "mode": "real",
        "ai_assisted_revenue": revenue,
        "verified_transactions": transactions,
        "all_verified_transactions": verified_transactions,
        "agent_conversion_rate": agent_conversion_rate,
        "conversion_rate": agent_conversion_rate,
        "conversion_lift": None,
        "baseline_conversion_rate": None,
        "conversion_lift_label": "Insufficient baseline data",
        "average_order_value": average_order_value,
        "upsell_revenue": 0,
        "upsell_transactions": 0,
        "upsell_revenue_label": "No attributed upsell purchases yet.",
        "recovered_revenue": 0,
        "recovered_transactions": 0,
        "recovered_revenue_label": "No recovered transactions yet.",
        "agent_sessions": sessions,
        "transactions": transactions,
        "metrics_source": {
            "ai_assisted_revenue": "verified payments linked to persisted agent sessions",
            "all_verified_transactions": "all verified payment rows",
            "upsell_revenue": "no persisted upsell attribution rows available",
            "recovered_revenue": "no persisted recovery attribution rows available",
        },
    }
