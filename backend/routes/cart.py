from __future__ import annotations

from flask import Blueprint, request

from backend.services.cart_service import calculate_cart
from backend.utils.errors import ok

bp = Blueprint("cart", __name__, url_prefix="/api/cart")


@bp.post("/calculate")
def calculate():
    product_ids = request.get_json(force=True).get("product_ids", ["NEC102", "JCA210"])
    return ok(calculate_cart(product_ids))
