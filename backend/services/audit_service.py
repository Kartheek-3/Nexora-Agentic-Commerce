from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.config import config
from backend.services.event_service import publish_event
from backend.services.supabase_service import create_audit_log, fetch_audit_logs, fetch_audit_logs_by_session, fetch_merchant_by_name

AUDIT_LOGS: list[dict[str, Any]] = []

DEMO_SESSION_ID = "demo_birthday_jewellery"
DEMO_REPLAY_EVENTS: list[dict[str, Any]] = [
    {"id": "r1", "session_id": DEMO_SESSION_ID, "sequence": 1, "actor_type": "customer", "event_type": "INTENT_RECEIVED", "description": "Birthday gift intent captured.", "status": "COMPLETED", "risk_level": "LOW", "authorization_status": "NOT_REQUIRED"},
    {"id": "r2", "session_id": DEMO_SESSION_ID, "sequence": 2, "actor_type": "agent", "event_type": "CATALOG_SEARCH", "description": "Minimal jewellery products ranked.", "status": "COMPLETED", "risk_level": "LOW", "authorization_status": "NOT_REQUIRED"},
    {"id": "r3", "session_id": DEMO_SESSION_ID, "sequence": 3, "actor_type": "agent", "event_type": "CROSS_SELL_PROPOSED", "description": "Jewellery case proposed as an explicit add-on.", "status": "AWAITING_APPROVAL", "risk_level": "LOW", "authorization_status": "REQUIRED"},
    {"id": "r4", "session_id": DEMO_SESSION_ID, "sequence": 4, "actor_type": "customer", "event_type": "CUSTOMER_APPROVAL", "description": "Customer authorized INR 3,698.", "status": "APPROVED", "risk_level": "LOW", "authorization_status": "APPROVED"},
    {"id": "r5", "session_id": DEMO_SESSION_ID, "sequence": 5, "actor_type": "razorpay", "event_type": "RAZORPAY_ORDER_CREATED", "description": "Demo Razorpay order created once.", "status": "COMPLETED", "risk_level": "LOW", "authorization_status": "APPROVED"},
    {"id": "r6", "session_id": DEMO_SESSION_ID, "sequence": 6, "actor_type": "razorpay", "event_type": "PAYMENT_VERIFIED", "description": "Payment success verified and written to audit.", "status": "COMPLETED", "risk_level": "LOW", "authorization_status": "APPROVED"},
]


def _safe_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    blocked = ("secret", "token", "signature", "key", "password", "cvv", "card")
    return {key: value for key, value in metadata.items() if not any(word in key.lower() for word in blocked)}


def record_event(
    event_type: str,
    description: str,
    metadata: dict[str, Any] | None = None,
    status: str = "COMPLETED",
    actor: str | None = None,
    action: str | None = None,
    session_id: str | None = None,
    merchant_id: str | None = None,
) -> dict[str, Any]:
    metadata = metadata or {}
    if session_id:
        metadata["session_id"] = session_id
    if action:
        metadata["action"] = action
    metadata = _safe_metadata(metadata)
    if not config.demo_mode:
        resolved_merchant_id = merchant_id or metadata.get("merchant_id")
        if not resolved_merchant_id:
            merchant = fetch_merchant_by_name("NEXORA Demo Store")
            resolved_merchant_id = merchant.get("id") if merchant else None
        event = create_audit_log(
            {
                "merchant_id": resolved_merchant_id,
                "agent_session_id": metadata.get("agent_session_id"),
                "actor_type": actor or metadata.get("actor_type", "system"),
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
        return event
    event = {
        "id": f"audit_{len(AUDIT_LOGS) + 1}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "actor_type": actor or metadata.get("actor_type", "system"),
        "event_type": event_type,
        "description": description,
        "reason_summary": metadata.get("reason_summary") if metadata else "",
        "risk_level": metadata.get("risk_level", "LOW") if metadata else "LOW",
        "authorization_status": metadata.get("authorization_status", "NOT_REQUIRED") if metadata else "NOT_REQUIRED",
        "status": status,
        "metadata": metadata,
    }
    AUDIT_LOGS.append(event)
    publish_event(event)
    return event


def list_events(limit: int = 50) -> list[dict[str, Any]]:
    if not config.demo_mode:
        return fetch_audit_logs(limit)
    return AUDIT_LOGS[-limit:]


def get_session_events(session_id: str) -> list[dict[str, Any]]:
    if not config.demo_mode:
        return fetch_audit_logs_by_session(session_id)
    dynamic = [event for event in AUDIT_LOGS if event.get("metadata", {}).get("session_id") == session_id]
    if dynamic:
        return sorted(dynamic, key=lambda event: event["created_at"])
    if session_id == DEMO_SESSION_ID:
        return DEMO_REPLAY_EVENTS
    return []
