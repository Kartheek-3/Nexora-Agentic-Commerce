from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


@dataclass(frozen=True)
class Config:
    flask_env: str = os.getenv("FLASK_ENV", "development")
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "")
    test_database_url: str = os.getenv("TEST_DATABASE_URL", "")
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "")
    firebase_private_key: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    firebase_client_email: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    razorpay_key_id: str = os.getenv("RAZORPAY_KEY_ID", "")
    razorpay_key_secret: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    razorpay_webhook_secret: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    ai_api_key: str = os.getenv("AI_API_KEY", "")
    ai_base_url: str = os.getenv("AI_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
    ai_model: str = os.getenv("AI_MODEL", "qwen3.8-max")
    redis_url: str = os.getenv("REDIS_URL", "")
    shopify_client_id: str = os.getenv("SHOPIFY_CLIENT_ID", "")
    shopify_client_secret: str = os.getenv("SHOPIFY_CLIENT_SECRET", "")
    shopify_redirect_uri: str = os.getenv("SHOPIFY_REDIRECT_URI", "")


config = Config()
