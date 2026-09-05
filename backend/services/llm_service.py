from __future__ import annotations

import json
import re
from json import JSONDecodeError

from pydantic import ValidationError

from backend.agent.schemas import Intent
from backend.config import config

SYSTEM_PROMPT = (
    "Extract commerce intent as strict JSON with keys: intent, category, subcategories, "
    "recipient, occasion, budget, keywords, preferences, constraints. Do not include chain-of-thought."
)

CATEGORY_KEYWORDS = {
    "Gaming": ["gaming", "game", "esports", "controller", "mouse pad"],
    "Computers & Accessories": ["keyboard", "mouse", "pc", "laptop", "work from home", "wfh", "desk setup", "webcam", "dock"],
    "Audio": ["headphones", "headset", "speaker", "earbuds", "audio", "wireless headphones"],
    "Jewellery": ["jewellery", "jewelry", "necklace", "ring", "earrings", "bracelet"],
    "Fitness & Sports": ["running", "fitness", "sports", "yoga", "dumbbell", "training"],
    "Office Products": ["office", "stationery", "work", "desk", "planner"],
    "Travel": ["travel", "backpack", "suitcase", "duffle"],
    "Beauty & Personal Care": ["beauty", "serum", "skin", "personal care"],
}

STOPWORDS = {"find", "under", "below", "with", "for", "the", "and", "need", "show", "products", "product"}


def _extract_budget(message: str) -> int:
    lowered = message.lower().replace(",", "").replace("₹", "rs ")
    shorthand = re.search(r"(\d{1,3})\s*k\b", lowered)
    if shorthand:
        return int(shorthand.group(1)) * 1000
    matches = re.findall(r"(?:inr|rs\.?|under|below|upto|up to)\s*(\d{3,6})", lowered)
    if matches:
        return int(matches[-1])
    number = re.search(r"(\d{3,6})", lowered)
    return int(number.group(1)) if number else 7000


def _category_for(message: str) -> str | None:
    lowered = message.lower()
    for category, tokens in CATEGORY_KEYWORDS.items():
        if any(token in lowered for token in tokens):
            return category
    return None


def _fallback_intent(message: str) -> Intent:
    lowered = message.lower()
    preferences = [word for word in ["minimal", "wireless", "premium", "accessories", "setup", "gift"] if word in lowered]
    keywords = [token for token in re.findall(r"[a-zA-Z]+", lowered) if len(token) > 2 and token not in STOPWORDS]
    return Intent(
        intent="purchase_gift" if "gift" in lowered or "birthday" in lowered else "product_search",
        category=_category_for(message),
        recipient="girlfriend" if "girlfriend" in lowered else None,
        occasion="birthday" if "birthday" in lowered else None,
        budget={"max": _extract_budget(message), "currency": "INR"},
        keywords=keywords,
        preferences=preferences,
    )


def _parse_intent(content: str) -> Intent:
    return Intent.model_validate(json.loads(content or "{}"))


def _normalize_intent(message: str, intent: Intent) -> Intent:
    fallback = _fallback_intent(message)
    return Intent(
        intent=intent.intent or fallback.intent,
        category=fallback.category or intent.category,
        subcategories=intent.subcategories,
        recipient=intent.recipient or fallback.recipient,
        occasion=intent.occasion or fallback.occasion,
        budget={"max": _extract_budget(message), "currency": "INR"},
        keywords=intent.keywords or fallback.keywords,
        preferences=list(dict.fromkeys([*intent.preferences, *fallback.preferences])),
        constraints=intent.constraints,
    )


def _provider_status(exc: Exception) -> int | None:
    return getattr(exc, "status_code", None) or getattr(getattr(exc, "response", None), "status_code", None)


def _log_llm_fallback(exc: Exception, retry: bool = False) -> None:
    status = _provider_status(exc)
    prefix = "llm retry failed" if retry else "llm extraction failed"
    print(f"[agent] {prefix} exception={type(exc).__name__} status={status} model={config.ai_model}", flush=True)
    if status == 402:
        print("[agent] llm unavailable status=402 reason=provider_billing_or_quota fallback=true", flush=True)
    print("[agent] deterministic fallback used=true", flush=True)


def structure_intent_with_llm(message: str) -> Intent:
    if not config.ai_api_key:
        print("[agent] deterministic fallback used=true reason=missing_ai_key", flush=True)
        return _fallback_intent(message)

    from openai import OpenAI

    client = OpenAI(api_key=config.ai_api_key, base_url=config.ai_base_url, timeout=20.0)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": message},
    ]
    try:
        response = client.chat.completions.create(model=config.ai_model, response_format={"type": "json_object"}, messages=messages)
    except Exception as exc:
        _log_llm_fallback(exc)
        return _fallback_intent(message)
    content = response.choices[0].message.content or "{}"
    try:
        print("[agent] LLM intent extraction succeeded", flush=True)
        return _normalize_intent(message, _parse_intent(content))
    except (JSONDecodeError, ValidationError):
        try:
            retry = client.chat.completions.create(
                model=config.ai_model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": f"{SYSTEM_PROMPT} Return only valid JSON. No markdown."},
                    {"role": "user", "content": message},
                ],
            )
        except Exception as exc:
            _log_llm_fallback(exc, retry=True)
            return _fallback_intent(message)
        try:
            print("[agent] LLM intent extraction succeeded", flush=True)
            return _normalize_intent(message, _parse_intent(retry.choices[0].message.content or "{}"))
        except (JSONDecodeError, ValidationError):
            print("[agent] deterministic fallback used=true reason=invalid_llm_json", flush=True)
            return _fallback_intent(message)
