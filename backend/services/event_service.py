from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any, Iterable

from backend.config import config

SAFE_EVENT_KEYS = {"id", "created_at", "actor_type", "event_type", "description", "risk_level", "authorization_status", "status", "metadata"}
STREAM_EVENTS = [
    {"id": "live_1", "event_type": "INTENT_RECEIVED", "description": "External buyer asked for a bounded gift purchase.", "actor_type": "agent", "risk_level": "LOW", "authorization_status": "NOT_REQUIRED", "status": "COMPLETED"},
    {"id": "live_2", "event_type": "POLICY_CHECK_PASSED", "description": "Merchant policy allowed INR 3,698 proposal.", "actor_type": "system", "risk_level": "LOW", "authorization_status": "REQUIRED", "status": "COMPLETED"},
    {"id": "live_3", "event_type": "AWAITING_APPROVAL", "description": "Checkout remains gated until the shopper approves.", "actor_type": "system", "risk_level": "LOW", "authorization_status": "REQUIRED", "status": "AWAITING_APPROVAL"},
]
RECENT_EVENTS: list[dict[str, Any]] = []


def sanitize_event(event: dict[str, Any]) -> dict[str, Any]:
    safe = {key: value for key, value in event.items() if key in SAFE_EVENT_KEYS}
    safe.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    safe["metadata"] = {key: value for key, value in safe.get("metadata", {}).items() if "secret" not in key.lower() and "key" not in key.lower()}
    return safe


def publish_event(event: dict[str, Any]) -> dict[str, Any]:
    safe = sanitize_event(event)
    RECENT_EVENTS.append(safe)
    del RECENT_EVENTS[:-25]
    return safe


def event_stream() -> Iterable[str]:
    while True:
        events = RECENT_EVENTS[-5:] or (STREAM_EVENTS if config.demo_mode else [])
        if not events:
            yield ": nexora heartbeat\n\n"
            time.sleep(10)
            continue
        for event in events:
            payload = sanitize_event(event)
            yield f"event: nexora.audit\ndata: {json.dumps(payload)}\n\n"
            time.sleep(2)
