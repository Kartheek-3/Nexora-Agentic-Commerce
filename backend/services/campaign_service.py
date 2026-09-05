from __future__ import annotations


def generate_campaign(prompt: str) -> dict:
    return {
        "prompt": prompt,
        "audience": "17 customers",
        "estimated_cart_value": 43820,
        "message": "Your gaming setup is still reserved. Complete your order today and keep the Orbit keyboard bundle offer active.",
        "channel": "Email demo channel",
        "estimated_recovery": "INR 8,000 - INR 12,000",
        "requires_approval_to_send": True,
    }
