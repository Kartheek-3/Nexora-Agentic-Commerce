from __future__ import annotations

from typing import Any


PRODUCTS: list[dict[str, Any]] = [
    {
        "id": "NEC102",
        "name": "Silver Celestial Necklace",
        "category": "Jewellery",
        "price": 2999,
        "currency": "INR",
        "inventory": 19,
        "description": "925 silver necklace with a restrained moonstone pendant and premium gift finish.",
        "attributes": {"material": "925 silver", "style": "minimal", "occasion": ["birthday", "anniversary", "gift"]},
        "intent_matches": ["gift under 4000", "minimal jewellery", "birthday gift"],
    },
    {
        "id": "JCA210",
        "name": "Premium Jewellery Case",
        "category": "Jewellery",
        "price": 699,
        "currency": "INR",
        "inventory": 38,
        "description": "Compact velvet travel case that upgrades the unboxing moment without breaking budget.",
        "attributes": {"material": "vegan velvet", "style": "minimal", "occasion": ["gift", "travel"]},
        "intent_matches": ["necklace accessory", "premium gifting", "cross-sell"],
    },
    {
        "id": "ORB501",
        "name": "Orbit Mechanical Keyboard",
        "category": "Gaming",
        "price": 4999,
        "currency": "INR",
        "inventory": 22,
        "description": "Aluminum 75% keyboard with hot-swap switches and low-latency wireless mode.",
        "attributes": {"layout": "75%", "switches": "linear", "intent": ["gaming setup", "creator desk"]},
        "intent_matches": ["gaming setup", "keyboard", "bundle"],
    },
    {
        "id": "PLX620",
        "name": "Pulse X Mouse",
        "category": "Gaming",
        "price": 1299,
        "currency": "INR",
        "inventory": 41,
        "description": "Lightweight wireless gaming mouse frequently paired with Orbit keyboards.",
        "attributes": {"weight": "68g", "connection": "wireless", "intent": ["cross-sell", "gaming setup"]},
        "intent_matches": ["mouse", "keyboard accessory", "cross-sell"],
    },
]

for index in range(44):
    category = ["Electronics", "Fashion", "Jewellery", "Home", "Beauty", "Gaming"][index % 6]
    PRODUCTS.append(
        {
            "id": f"{category[:3].upper()}{300 + index}",
            "name": f"Nexora {category} Item {index + 1}",
            "category": category,
            "price": 799 + ((index * 431) % 8400),
            "currency": "INR",
            "inventory": 8 + ((index * 7) % 51),
            "description": f"Realistic {category.lower()} demo product with agent-readable metadata.",
            "attributes": {"style": "minimal" if index % 2 else "premium", "intent": ["gift", "bundle", "agent-readable"]},
            "intent_matches": ["agent-readable catalog", "available inventory", "policy-safe"],
        }
    )

AUDIT_EVENTS = [
    "INTENT_RECEIVED",
    "CATALOG_SEARCH",
    "PRODUCT_RECOMMENDATION",
    "CROSS_SELL_PROPOSED",
    "CUSTOMER_APPROVAL",
    "RAZORPAY_ORDER_CREATED",
    "PAYMENT_VERIFIED",
]
