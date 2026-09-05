from __future__ import annotations

from flask import Blueprint, request

from backend.services.catalog_service import list_catalog
from backend.utils.errors import ok

bp = Blueprint("catalog", __name__, url_prefix="/api/catalog")


@bp.get("")
def catalog():
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("page_size", 24)), 100)
    return ok(list_catalog(page, page_size))
