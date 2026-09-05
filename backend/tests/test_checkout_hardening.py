from __future__ import annotations

import pytest
from types import SimpleNamespace

from backend.services.checkout_service import CheckoutError, authorize_checkout, create_checkout_order, verify_checkout_payment


def test_real_mode_rejects_missing_persisted_authorization(monkeypatch):
    monkeypatch.setattr("backend.services.checkout_service.config", SimpleNamespace(demo_mode=False, razorpay_key_id="rzp_test_example", razorpay_key_secret="secret"))
    monkeypatch.setattr("backend.services.checkout_service._validated_real_cart", lambda _cart_id: ({"id": "cart_1", "merchant_id": "merchant_1", "cart_items": []}, [], 3698))
    monkeypatch.setattr("backend.services.checkout_service.fetch_profile_by_firebase_uid", lambda _uid: {"id": "profile_1"})
    monkeypatch.setattr("backend.services.checkout_service.fetch_agent_action", lambda *_args: None)

    with pytest.raises(CheckoutError) as exc:
        create_checkout_order("cart_1", "idem_123456789", "firebase_uid")

    assert exc.value.code == "AUTHORIZATION_REQUIRED"


def test_verify_rejects_mismatched_stored_order(monkeypatch):
    monkeypatch.setattr("backend.services.checkout_service.config", SimpleNamespace(demo_mode=False, razorpay_key_id="rzp_test_example", razorpay_key_secret="secret"))
    monkeypatch.setattr("backend.services.checkout_service.fetch_profile_by_firebase_uid", lambda _uid: {"id": "profile_1"})
    monkeypatch.setattr(
        "backend.services.checkout_service.fetch_agent_action",
        lambda *_args: {"id": "action_1", "user_id": "profile_1", "approval_status": "APPROVED", "execution_result": {"razorpay_order_id": "order_A"}},
    )

    with pytest.raises(CheckoutError) as exc:
        verify_checkout_payment("action_1", "order_B", "pay_1", "sig", "firebase_uid")

    assert exc.value.code == "ORDER_MISMATCH"


def test_demo_checkout_returns_checkout_request_id(monkeypatch):
    monkeypatch.setattr("backend.services.checkout_service.config", SimpleNamespace(demo_mode=True, razorpay_key_id="rzp_test_example", razorpay_key_secret="secret"))

    result = create_checkout_order("demo_cart_birthday", "idem_123456789", "demo_user")

    assert result["checkout_request_id"] == "idem_123456789"
    assert result["amount"] == 369800


def test_authorize_reuses_existing_approved_action(monkeypatch):
    monkeypatch.setattr("backend.services.checkout_service.config", SimpleNamespace(demo_mode=False, razorpay_key_id="rzp_test_example", razorpay_key_secret="secret"))
    monkeypatch.setattr("backend.services.checkout_service._resolve_checkout_cart", lambda *_args: "cart_1")
    monkeypatch.setattr("backend.services.checkout_service._validated_real_cart", lambda _cart_id: ({"id": "cart_1", "merchant_id": "merchant_1", "cart_items": []}, [], 3698))
    monkeypatch.setattr("backend.services.checkout_service._profile_for_user", lambda *_args: {"id": "profile_1"})
    monkeypatch.setattr(
        "backend.services.checkout_service.fetch_agent_action",
        lambda *_args: {"id": "action_1", "user_id": "profile_1", "approval_status": "APPROVED", "requested_payload": {"cart_id": "cart_1"}},
    )

    result = authorize_checkout("cart_1", "idem_123456789", "firebase_uid")

    assert result["authorization_id"] == "action_1"
    assert result["cart_id"] == "cart_1"
    assert result["amount"] == 369800
    assert result["idempotent_replay"] is True


def test_authorize_rejects_conflicting_existing_action(monkeypatch):
    monkeypatch.setattr("backend.services.checkout_service.config", SimpleNamespace(demo_mode=False, razorpay_key_id="rzp_test_example", razorpay_key_secret="secret"))
    monkeypatch.setattr("backend.services.checkout_service._resolve_checkout_cart", lambda *_args: "cart_1")
    monkeypatch.setattr("backend.services.checkout_service._validated_real_cart", lambda _cart_id: ({"id": "cart_1", "merchant_id": "merchant_1", "cart_items": []}, [], 3698))
    monkeypatch.setattr("backend.services.checkout_service._profile_for_user", lambda *_args: {"id": "profile_1"})
    monkeypatch.setattr(
        "backend.services.checkout_service.fetch_agent_action",
        lambda *_args: {"id": "action_1", "user_id": "profile_2", "approval_status": "APPROVED", "requested_payload": {"cart_id": "cart_1"}},
    )

    with pytest.raises(CheckoutError) as exc:
        authorize_checkout("cart_1", "idem_123456789", "firebase_uid")

    assert exc.value.code == "AUTHORIZATION_USER_MISMATCH"
