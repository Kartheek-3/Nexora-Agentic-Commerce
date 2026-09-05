from typing import Any
from flask import jsonify


def ok(data: Any = None, message: str = "ok", status: int = 200):
    return jsonify({"ok": True, "message": message, "data": data}), status


def fail(message: str, status: int = 400, code: str = "BAD_REQUEST"):
    return jsonify({"ok": False, "error": {"code": code, "message": message}}), status
