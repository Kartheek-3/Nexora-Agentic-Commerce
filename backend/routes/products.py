from __future__ import annotations

from flask import Blueprint

from backend.services.catalog_service import get_product
from backend.utils.errors import fail, ok

bp = Blueprint("products", __name__, url_prefix="/api/products")


@bp.get("/<product_id>")
def product(product_id: str):
    found = get_product(product_id)
    if not found:
        return fail("Product not found.", 404, "NOT_FOUND")
    return ok(found)
