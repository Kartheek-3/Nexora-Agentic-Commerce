from __future__ import annotations

from backend.config import config
from backend.services.supabase_service import fetch_agent_payment_links, fetch_agent_sessions_count, fetch_agent_verified_payment_events, fetch_checkout_funnel_stats, fetch_completed_recoveries, fetch_realized_upsells, fetch_verified_payments

MIN_CONVERSION_SAMPLE = 3


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


def _funnel_metrics() -> dict:
    rows = fetch_checkout_funnel_stats()
    stats = {
        "agent_sessions": 0,
        "agent_converted": 0,
        "direct_sessions": 0,
        "direct_converted": 0,
    }
    for row in rows:
        channel = row.get("channel")
        status = row.get("status")
        if channel == "agent":
            stats["agent_sessions"] += 1
            if status == "converted":
                stats["agent_converted"] += 1
        elif channel == "direct":
            stats["direct_sessions"] += 1
            if status == "converted":
                stats["direct_converted"] += 1
    agent_rate = round((stats["agent_converted"] / stats["agent_sessions"]) * 100, 2) if stats["agent_sessions"] else None
    direct_rate = round((stats["direct_converted"] / stats["direct_sessions"]) * 100, 2) if stats["direct_sessions"] else None
    lift = None
    label = "Insufficient baseline data"
    if (
        stats["agent_sessions"] >= MIN_CONVERSION_SAMPLE
        and stats["direct_sessions"] >= MIN_CONVERSION_SAMPLE
        and direct_rate
        and agent_rate is not None
    ):
        lift = round(((agent_rate - direct_rate) / direct_rate) * 100, 2)
        label = f"Agent conversion {agent_rate}% vs baseline {direct_rate}%"
    return {**stats, "agent_conversion_rate": agent_rate, "baseline_conversion_rate": direct_rate, "conversion_lift": lift, "conversion_lift_label": label}


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
    persisted_sessions = fetch_agent_sessions_count()
    funnel = _funnel_metrics()
    sessions = funnel["agent_sessions"] or persisted_sessions
    agent_conversion_rate = funnel["agent_conversion_rate"] if funnel["agent_conversion_rate"] is not None else (round((transactions / persisted_sessions) * 100, 2) if persisted_sessions else None)
    average_order_value = round(revenue / transactions) if transactions else 0
    upsells = fetch_realized_upsells()
    upsell_revenue = sum(int(item.get("realized_revenue_inr") or 0) for item in upsells)
    upsell_order_ids = {item.get("realized_order_id") for item in upsells if item.get("realized_order_id")}
    recoveries = fetch_completed_recoveries()
    recovered_revenue = sum(int(item.get("recovered_amount_inr") or 0) for item in recoveries)
    return {
        "mode": "real",
        "ai_assisted_revenue": revenue,
        "verified_transactions": transactions,
        "all_verified_transactions": verified_transactions,
        "agent_conversion_rate": agent_conversion_rate,
        "conversion_rate": agent_conversion_rate,
        "conversion_lift": funnel["conversion_lift"],
        "baseline_conversion_rate": funnel["baseline_conversion_rate"],
        "conversion_lift_label": funnel["conversion_lift_label"],
        "average_order_value": average_order_value,
        "upsell_revenue": upsell_revenue,
        "upsell_transactions": len(upsell_order_ids),
        "upsell_revenue_label": "Revenue from accepted agent recommendations." if upsell_revenue else "No attributed upsell purchases yet.",
        "recovered_revenue": recovered_revenue,
        "recovered_transactions": len(recoveries),
        "recovered_revenue_label": "Verified revenue recovered from preserved carts." if recovered_revenue else "No recovered transactions yet.",
        "agent_sessions": sessions,
        "transactions": transactions,
        "metrics_source": {
            "ai_assisted_revenue": "verified payments linked to persisted agent sessions",
            "all_verified_transactions": "all verified payment rows",
            "upsell_revenue": "realized accepted cross-sell recommendations linked to verified payments",
            "recovered_revenue": "completed recovery attempts linked to verified payments",
        },
    }
