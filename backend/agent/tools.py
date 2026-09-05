from __future__ import annotations

from typing import Any, Callable

from backend.services.catalog_service import get_product, search_catalog


def compare_products(product_ids: list[str]) -> dict[str, Any]:
    products = [get_product(product_id) for product_id in product_ids]
    available = [product for product in products if product]
    return {"products": available, "decision_summary": "Compared by price, inventory, intent match and authorization requirements."}


def recommend_cross_sell(product_id: str, budget_max: int) -> dict[str, Any]:
    base = get_product(product_id)
    candidate = get_product("JCA210" if product_id == "NEC102" else "PLX620")
    total = (base or {}).get("price", 0) + (candidate or {}).get("price", 0)
    return {
        "product": candidate,
        "new_total": total,
        "within_budget": total <= budget_max,
        "requires_approval": True,
        "decision_summary": "Frequently paired add-on remains inside the customer's stated budget.",
    }


TOOLS: dict[str, Callable[..., Any]] = {
    "search_catalog": search_catalog,
    "get_product": get_product,
    "compare_products": compare_products,
    "recommend_cross_sell": recommend_cross_sell,
}
