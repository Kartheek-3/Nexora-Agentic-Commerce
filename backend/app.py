from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from backend.routes.agent import bp as agent_bp
from backend.routes.agent_commerce import bp as agent_commerce_bp
from backend.routes.analytics import bp as analytics_bp
from backend.routes.audit import bp as audit_bp
from backend.routes.auth import bp as auth_bp
from backend.routes.cart import bp as cart_bp
from backend.routes.catalog import bp as catalog_bp
from backend.routes.campaigns import bp as campaigns_bp
from backend.routes.checkout import bp as checkout_bp
from backend.routes.events import bp as events_bp
from backend.routes.merchant import bp as merchant_bp
from backend.routes.products import bp as products_bp
from backend.config import config
from backend.services.supabase_service import check_supabase_connection
from backend.utils.errors import fail, ok


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(
        app,
        resources={r"/api/*": {"origins": [config.frontend_url, "http://127.0.0.1:5173", "http://localhost:5173",r"https://nexora-.*\.vercel\.app", "https://nexora-agentic-commerce-nu.vercel.app", "https://nexora-agentic-commerce-infrastructure-2e4u638ru.vercel.app"]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        supports_credentials=False,
    )
    app.register_blueprint(agent_bp)
    app.register_blueprint(agent_commerce_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(catalog_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(cart_bp)
    app.register_blueprint(checkout_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(merchant_bp)
    app.register_blueprint(campaigns_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(audit_bp)

    @app.get("/api/health")
    def health():
        return ok(
            {
                "status": "ok",
                "service": "nexora-api",
                "mode": "demo" if config.demo_mode else "real",
                "integrations": {
                    "supabase": check_supabase_connection(),
                    "firebase": bool(config.firebase_project_id and config.firebase_client_email and config.firebase_private_key),
                    "qwen": bool(config.ai_api_key and config.ai_base_url and config.ai_model),
                    "razorpay": bool(config.razorpay_key_id and config.razorpay_key_secret),
                },
            }
        )

    @app.errorhandler(404)
    def not_found(_error):
        return fail("Route not found.", 404, "NOT_FOUND")

    @app.errorhandler(Exception)
    def server_error(_error):
        return fail("Unexpected server error.", 500, "INTERNAL_ERROR")

    return app


app = create_app()
