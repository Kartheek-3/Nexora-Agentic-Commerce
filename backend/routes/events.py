from __future__ import annotations

from flask import Blueprint, Response

from backend.services.event_service import event_stream

bp = Blueprint("events", __name__, url_prefix="/api/events")


@bp.get("/stream")
def stream():
    return Response(event_stream(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
