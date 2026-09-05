from __future__ import annotations

from uuid import uuid4

from flask import Blueprint, request

from backend.services.audit_service import record_event
from backend.services.catalog_service import get_product, list_catalog, search_catalog
from backend.services.cart_service import calculate_cart
from backend.services.guardrail_service import simulate_policy
from backend.utils.errors import fail, ok

bp = Blueprint("agent_commerce", __name__, url_prefix="/api/agent-commerce")

CARTS: dict[str, list[str]] = {}
ORDER_PROPOSALS: dict[str, dict] = {}


@bp.get("/manifest")
def manifest():
    return ok(
        {
            "merchant": {"name": "NEXORA Demo Merchant", "currency": "INR"},
            "name": "NEXORA Agent Commerce Gateway",
            "version": "1.0",
            "capabilities": ["catalog_search", "product_lookup", "inventory_lookup", "cart_creation", "cart_modification", "quote_generation", "checkout_request", "order_status"],
            "financial_policy": {"requires_human_authorization": True, "agent_can_execute_payment": False},
            "endpoints": {
                "catalog": "/api/agent-commerce/catalog",
                "search": "/api/agent-commerce/search",
                "cart": "/api/agent-commerce/cart",
                "quote": "/api/agent-commerce/quote",
                "request_checkout": "/api/agent-commerce/request-checkout",
            },
        }
    )


@bp.get("/catalog")
def catalog():
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 24)), 100)
    return ok(list_catalog(page, page_size))


@bp.post("/search")
def search():
    body = request.get_json(silent=True) or {}
    results = search_catalog(
        body.get("query", ""),
        body.get("max_price"),
        body.get("category"),
        body.get("merchant_id"),
        int(body.get("page", 1)),
        min(int(body.get("page_size", 24)), 100),
    )
    record_event("EXTERNAL_AGENT_SEARCH", "External buyer gateway searched catalog.", {"query": body.get("query", ""), "result_count": len(results)})
    return ok({"results": results})


@bp.get("/products/<product_id>")
def product(product_id: str):
    found = get_product(product_id)
    if not found:
        return fail("Product not found.", 404, "PRODUCT_NOT_FOUND")
    return ok(found)


@bp.post("/cart")
def create_cart():
    body = request.get_json(silent=True) or {}
    product_ids = body.get("product_ids", [])
    if not isinstance(product_ids, list):
        return fail("product_ids must be a list.", 422, "VALIDATION_ERROR")
    cart_id = f"cart_{uuid4().hex[:10]}"
    CARTS[cart_id] = [str(product_id) for product_id in product_ids]
    return ok({"cart_id": cart_id, **calculate_cart(CARTS[cart_id])})


@bp.post("/cart/<cart_id>/items")
def add_cart_item(cart_id: str):
    body = request.get_json(silent=True) or {}
    product_id = body.get("product_id")
    if not product_id:
        return fail("product_id is required.", 422, "VALIDATION_ERROR")
    CARTS.setdefault(cart_id, []).append(str(product_id))
    return ok({"cart_id": cart_id, **calculate_cart(CARTS[cart_id])})


@bp.get("/cart/<cart_id>")
def get_cart(cart_id: str):
    if cart_id not in CARTS:
        return fail("Cart not found.", 404, "CART_NOT_FOUND")
    return ok({"cart_id": cart_id, **calculate_cart(CARTS[cart_id])})


@bp.post("/quote")
def quote():
    body = request.get_json(silent=True) or {}
    product_ids = body.get("product_ids") or CARTS.get(body.get("cart_id", ""), [])
    cart = calculate_cart(product_ids)
    items = cart["items"]
    policy = simulate_policy("request_checkout", amount=cart["total"], category=items[0]["category"] if items else "")
    return ok({**cart, "policy": policy, "requires_authorization": True})


@bp.post("/request-checkout")
def request_checkout():
    body = request.get_json(silent=True) or {}
    product_ids = body.get("product_ids") or CARTS.get(body.get("cart_id", ""), [])
    cart = calculate_cart(product_ids)
    items = cart["items"]
    if not items:
        return fail("Cart has no valid products.", 422, "EMPTY_CART")
    policy = simulate_policy("request_checkout", amount=cart["total"], category=items[0]["category"])
    proposal_id = f"proposal_{uuid4().hex[:10]}"
    proposal = {"checkout_request_id": proposal_id, "proposal_id": proposal_id, **cart, "policy": policy, "status": "awaiting_human_authorization", "authorization_required": True}
    ORDER_PROPOSALS[proposal_id] = proposal
    record_event("EXTERNAL_CHECKOUT_REQUESTED", "External buyer requested checkout; payment remains gated.", {"proposal_id": proposal_id, "total": cart["total"], "authorization_status": "REQUIRED", "risk_level": policy["risk_level"]})
    return ok(proposal)


@bp.get("/orders/<order_id>")
def order_status(order_id: str):
    proposal = ORDER_PROPOSALS.get(order_id)
    if not proposal:
        return fail("Order proposal not found.", 404, "ORDER_NOT_FOUND")
    return ok(proposal)
