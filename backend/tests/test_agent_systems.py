from __future__ import annotations

from backend.app import create_app
from backend.services.audit_service import DEMO_SESSION_ID, get_session_events
from backend.services.evaluation_service import run_evaluations
from backend.services.event_service import sanitize_event
from backend.services.guardrail_service import simulate_policy


def test_policy_blocks_high_value_checkout():
    decision = simulate_policy("checkout", amount=12000, discount_percent=0, category="Jewellery")

    assert decision["passed"] is False
    assert decision["risk_level"] == "HIGH"
    assert decision["violations"]


def test_evaluation_suite_passes_demo_cases():
    result = run_evaluations()

    assert result["total"] == 5
    assert result["failed"] == 0
    assert result["score"] == 100
    assert result["payment_approval_bypasses"] == 0


def test_replay_returns_ordered_demo_events():
    events = get_session_events(DEMO_SESSION_ID)

    assert [event["sequence"] for event in events] == sorted(event["sequence"] for event in events)
    assert events[0]["event_type"] == "INTENT_RECEIVED"


def test_event_sanitizer_removes_secret_metadata():
    event = sanitize_event({"id": "x", "metadata": {"api_key": "hidden", "safe": "visible"}, "event_type": "TEST"})

    assert event["metadata"] == {"safe": "visible"}


def test_external_gateway_manifest_and_quote():
    app = create_app()
    client = app.test_client()

    manifest = client.get("/api/agent-commerce/manifest")
    assert manifest.status_code == 200
    assert manifest.get_json()["data"]["financial_policy"]["requires_human_authorization"] is True

    quote = client.post("/api/agent-commerce/quote", json={"product_ids": ["NEC102", "JCA210"]})
    payload = quote.get_json()["data"]
    assert quote.status_code == 200
    assert payload["total"] == 3698
    assert payload["requires_authorization"] is True

    proposal = client.post("/api/agent-commerce/request-checkout", json={"product_ids": ["NEC102", "JCA210"]})
    checkout = proposal.get_json()["data"]
    assert proposal.status_code == 200
    assert checkout["status"] == "awaiting_human_authorization"
    assert "razorpay_order_id" not in checkout
