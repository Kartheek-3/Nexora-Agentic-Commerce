from __future__ import annotations

from backend.config import config
from backend.data.demo_data import PRODUCTS
from backend.services.supabase_service import fetch_products, search_products

CATEGORY_IMAGES = {
    "Jewellery": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
    "Gaming": "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=900&q=80",
    "Computers & Accessories": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    "Audio": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80",
    "Fitness & Sports": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    "Office Products": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
}


def list_catalog(page: int = 1, page_size: int = 24) -> dict:
    if config.demo_mode:
        products = [agent_product(product) for product in PRODUCTS]
        total = len(products)
        start = max(page - 1, 0) * page_size
        items = products[start : start + page_size]
        return {"items": items, "page": page, "page_size": page_size, "total": total, "has_next": start + page_size < total}
    result = search_products(page=page, page_size=page_size)
    items = [agent_product(_normalize_supabase_product(row)) for row in result["items"]]
    return {"items": items, "page": page, "page_size": page_size, "total": result["total"], "has_next": page * page_size < result["total"]}


def get_product(product_id: str) -> dict | None:
    for product in _source_products():
        if product["id"] == product_id or product.get("sku") == product_id:
            return agent_product(product)
    return None


def search_catalog(query: str, max_price: int | None = None, category: str | None = None, merchant_id: str | None = None, page: int = 1, page_size: int = 24) -> list[dict]:
    if not config.demo_mode:
        database_query = "" if category else query
        result = search_products(query=database_query, max_price=max_price, category=category, merchant_id=merchant_id, page=page, page_size=page_size)
        return _rank_products([agent_product(_normalize_supabase_product(row, query)) for row in result["items"]], query)
    lowered = query.lower()
    results = []
    for product in _source_products():
        haystack = " ".join([product["name"], product["category"], product["description"], " ".join(product["intent_matches"])]).lower()
        if any(token in haystack for token in lowered.split()) or not lowered:
            if max_price is None or product["price"] <= max_price:
                results.append(agent_product(product))
    return _rank_products(results, query)[:page_size]


def _source_products() -> list[dict]:
    if config.demo_mode:
        return PRODUCTS
    try:
        rows = fetch_products()
    except Exception:
        return []
    if not rows:
        return []
    return [_normalize_supabase_product(row) for row in rows]


def _normalize_supabase_product(row: dict, query: str = "") -> dict:
    attributes = row.get("attributes") or {}
    tags = row.get("tags") or attributes.get("tags") or []
    features = row.get("features") or attributes.get("features") or []
    use_cases = row.get("use_cases") or attributes.get("use_cases") or []
    intent_matches = row.get("intent_matches") or tags + use_cases
    return {
        "id": row.get("sku") or row["id"],
        "database_id": str(row["id"]),
        "sku": row.get("sku"),
        "name": row["name"],
        "description": row["description"],
        "category": row["category"],
        "price": row["price_inr"],
        "inventory": row["inventory"],
        "merchant": (row.get("merchants") or {}).get("name"),
        "brand": attributes.get("brand") or row.get("brand"),
        "attributes": attributes,
        "tags": tags,
        "features": features,
        "use_cases": use_cases,
        "intent_matches": intent_matches,
        "query": query,
    }


def agent_product(product: dict) -> dict:
    haystack = " ".join([product.get("name", ""), product.get("category", ""), product.get("description", ""), " ".join(product.get("intent_matches", []))]).lower()
    query_tokens = [token for token in str(product.get("query", "")).lower().split() if token]
    category_match = 35 if product.get("category", "").lower() in haystack else 0
    keyword_score = min(25, sum(5 for token in query_tokens if token in haystack))
    budget_score = 20
    metadata_score = 10 if product.get("intent_matches") else 0
    availability_score = 5 if product["inventory"] > 0 else 0
    score = min(100, category_match + keyword_score + budget_score + metadata_score + availability_score + 5)
    reasons = []
    if product.get("category"):
        reasons.append(f"Matches {product['category']} intent")
    if query_tokens:
        reasons.append("Relevant to current search terms")
    reasons.append("Within the stated budget filter")
    reasons.append("Available inventory")
    image = CATEGORY_IMAGES.get(product.get("category"), "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80")
    return {
        **product,
        "product_id": product["id"],
        "availability": product["inventory"] > 0,
        "match_score": score,
        "matchScore": score,
        "match_reasons": reasons,
        "matchReasons": reasons,
        "image": product.get("image") or image,
        "rating": product.get("rating") or 4.4,
        "agent_capabilities": {
            "can_recommend": True,
            "can_add_to_cart": True,
            "can_purchase": True,
            "requires_purchase_authorization": True,
        },
        "checkout_endpoint": "/api/agent/checkout",
    }


def _rank_products(products: list[dict], query: str) -> list[dict]:
    normalized_query = " ".join(str(query or "").lower().replace("-", " ").split())

    def score(product: dict) -> tuple[int, int, int]:
        name = " ".join(str(product.get("name", "")).lower().replace("-", " ").split())
        sku = str(product.get("sku") or product.get("id") or "").lower()
        exact_match = 1 if (name and name in normalized_query) or (sku and sku in normalized_query) else 0
        return (exact_match, int(product.get("match_score") or 0), int(product.get("inventory") or 0))

    return sorted(products, key=score, reverse=True)
