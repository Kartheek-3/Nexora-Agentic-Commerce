from __future__ import annotations

from backend.services.catalog_service import get_product


def calculate_cart(product_ids: list[str]) -> dict:
    items = [get_product(product_id) for product_id in product_ids]
    available = [item for item in items if item]
    total = sum(item["price"] for item in available)
    return {"items": available, "total": total, "currency": "INR"}
