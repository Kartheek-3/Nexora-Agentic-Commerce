from __future__ import annotations

from uuid import uuid4

from backend.agent.schemas import Intent
from backend.config import config
from backend.services.audit_service import record_event
from backend.services.catalog_service import search_catalog
from backend.services.llm_service import structure_intent_with_llm
from backend.services.supabase_service import create_agent_session, create_recommendation, fetch_merchant_by_name


class AgentPipelineError(RuntimeError):
    def __init__(self, message: str, code: str, status: int = 503):
        super().__init__(message)
        self.code = code
        self.status = status


def structure_intent(message: str) -> Intent:
    if not config.demo_mode:
        return structure_intent_with_llm(message)

    lowered = message.lower()
    preferences = []
    if "minimal" in lowered:
        preferences.append("minimal")
    if "jewellery" in lowered or "jewelry" in lowered:
        preferences.append("jewellery")
    return Intent(
        intent="purchase_gift" if "gift" in lowered or "birthday" in lowered else "browse",
        category="Jewellery" if "jewellery" in lowered or "jewelry" in lowered else "Gaming" if "gaming" in lowered else None,
        recipient="girlfriend" if "girlfriend" in lowered else None,
        occasion="birthday" if "birthday" in lowered else None,
        budget={"max": 4000 if "4000" in lowered or "4,000" in lowered else 7000, "currency": "INR"},
        keywords=[word for word in lowered.replace(",", "").split() if len(word) > 2],
        preferences=preferences,
    )


def run_commerce_agent(message: str) -> dict:
    if not message.strip():
        raise ValueError("INVALID_AGENT_PROMPT")
    request_id = f"agent_{uuid4().hex[:10]}"
    print(f"[agent] request received request_id={request_id}", flush=True)
    print(f"[agent] prompt validated request_id={request_id} prompt_present={bool(message.strip())}", flush=True)
    print(f"[agent] intent extraction starting request_id={request_id}", flush=True)
    try:
        intent = structure_intent(message)
    except Exception as exc:
        print(f"[agent] intent extraction failed request_id={request_id} exception={type(exc).__name__}", flush=True)
        raise AgentPipelineError("Commerce Agent is temporarily unavailable. Please try again.", "INTENT_EXTRACTION_FAILED") from exc
    print(f"[agent] structured intent ready request_id={request_id} category={intent.category} budget={intent.budget.max if intent.budget else None}", flush=True)
    agent_session_id = None
    merchant_id = None
    if not config.demo_mode:
        try:
            merchant = fetch_merchant_by_name("NEXORA Demo Store")
            merchant_id = merchant.get("id") if merchant else None
            if not merchant_id:
                raise AgentPipelineError("Commerce Agent is temporarily unavailable. Please try again.", "MERCHANT_NOT_FOUND")
            session = create_agent_session({"merchant_id": merchant_id, "intent": intent.model_dump(), "status": "active"})
            agent_session_id = session.get("id")
            if not agent_session_id:
                raise AgentPipelineError("Commerce Agent is temporarily unavailable. Please try again.", "AGENT_SESSION_CREATE_FAILED")
            print("[agent] persisted session agent_session_present=True", flush=True)
        except AgentPipelineError:
            raise
        except Exception as exc:
            print(f"[agent] session persistence failed request_id={request_id} exception={type(exc).__name__}", flush=True)
            raise AgentPipelineError("Commerce Agent is temporarily unavailable. Please try again.", "AGENT_SESSION_CREATE_FAILED") from exc
    budget_max = intent.budget.max if intent.budget else None
    query = " ".join([*(intent.keywords or []), *(intent.preferences or []), intent.category or "", intent.occasion or ""]).strip()
    print(f"[agent] catalog search starting request_id={request_id}", flush=True)
    try:
        candidates = search_catalog(query, budget_max, intent.category, page_size=200)
    except Exception as exc:
        print(f"[agent] catalog search failed request_id={request_id} exception={type(exc).__name__}", flush=True)
        raise AgentPipelineError("Commerce Agent is temporarily unavailable. Please try again.", "CATALOG_SEARCH_FAILED") from exc
    print(f"[agent] catalog search completed request_id={request_id} count={len(candidates)}", flush=True)
    print(f"[agent] ranking starting request_id={request_id}", flush=True)
    try:
        recommendations = [item for item in candidates if item.get("availability") and (budget_max is None or item.get("price", 0) <= budget_max)][:3]
        recommended_skus = [item.get("sku") or item.get("id") for item in recommendations]
        cross_sell = _recommend_session_cross_sell(recommendations[0], candidates, budget_max) if recommendations else None
        if cross_sell and agent_session_id:
            product = cross_sell.get("product") or {}
            product_id = product.get("database_id") or product.get("id")
            if product_id:
                persisted = create_recommendation(
                    {
                        "agent_session_id": agent_session_id,
                        "product_id": product_id,
                        "recommendation_type": "cross_sell",
                        "decision_summary": cross_sell.get("decision_summary"),
                        "confidence": product.get("match_score"),
                        "status": "proposed",
                    }
                )
                cross_sell["recommendation_id"] = persisted.get("id")
    except Exception as exc:
        print(f"[agent] ranking failed request_id={request_id} exception={type(exc).__name__}", flush=True)
        raise AgentPipelineError("Commerce Agent is temporarily unavailable. Please try again.", "RANKING_FAILED") from exc
    print(f"[agent] ranking completed request_id={request_id} count={len(recommendations)} skus={recommended_skus}", flush=True)
    print(f"[agent] audit persistence starting request_id={request_id}", flush=True)
    try:
        record_event("SESSION_STARTED", "Commerce agent session started.", {"request_id": request_id, "risk_level": "LOW"}, actor="customer", action="start_agent_session", session_id=request_id, agent_session_id=agent_session_id, merchant_id=merchant_id)
        record_event("INTENT_RECEIVED", "Commerce agent received shopper intent.", {"request_id": request_id, "category": intent.category, "budget_max": budget_max, "risk_level": "LOW"}, actor="customer", action="submit_intent", session_id=request_id, agent_session_id=agent_session_id, merchant_id=merchant_id)
        record_event("INTENT_PARSED", "Commerce agent parsed structured buying constraints.", {"request_id": request_id, "structured_intent": intent.model_dump(), "risk_level": "LOW"}, actor="agent", action="parse_intent", session_id=request_id, agent_session_id=agent_session_id, merchant_id=merchant_id)
        record_event("CATALOG_SEARCHED", "Commerce agent searched the live catalog.", {"request_id": request_id, "candidate_count": len(candidates), "category": intent.category, "budget_max": budget_max, "active_only": True, "in_stock_only": True, "risk_level": "LOW"}, actor="agent", action="search_catalog", session_id=request_id, agent_session_id=agent_session_id, merchant_id=merchant_id)
        if recommendations:
            record_event(
                "PRODUCT_RECOMMENDED",
                "Commerce agent returned ranked product recommendations.",
                {
                    "request_id": request_id,
                    "product_ids": [item.get("database_id") or item.get("id") for item in recommendations],
                    "skus": recommended_skus,
                    "scores": [item.get("match_score") for item in recommendations],
                    "risk_level": "LOW",
                },
                actor="agent",
                action="rank_products",
                session_id=request_id,
                agent_session_id=agent_session_id,
                merchant_id=merchant_id,
            )
        if cross_sell and cross_sell.get("recommendation_id"):
            record_event(
                "CROSS_SELL_PROPOSED",
                "Commerce agent proposed a cross-sell recommendation.",
                {
                    "request_id": request_id,
                    "recommendation_id": cross_sell.get("recommendation_id"),
                    "product_id": (cross_sell.get("product") or {}).get("database_id") or (cross_sell.get("product") or {}).get("id"),
                    "risk_level": "LOW",
                },
                actor="agent",
                action="propose_cross_sell",
                session_id=request_id,
                agent_session_id=agent_session_id,
                merchant_id=merchant_id,
            )
        print(f"[agent] audit persistence completed request_id={request_id}", flush=True)
    except Exception as exc:
        print(f"[agent] audit persistence failed request_id={request_id} exception={type(exc).__name__}", flush=True)
    print(f"[agent] response ready request_id={request_id}", flush=True)
    return {
        "request_id": request_id,
        "agent_session_id": agent_session_id,
        "structured_intent": {**intent.model_dump(), "budget_max": budget_max, "currency": "INR"},
        "candidate_count": len(candidates),
        "recommendations": [{"product": item, "score": item["match_score"], "reason": item["match_reasons"][0], "within_budget": budget_max is None or item["price"] <= budget_max} for item in recommendations],
        "cross_sell": [cross_sell] if cross_sell and cross_sell.get("product") else [],
        "constraints": {"category": intent.category, "budget_max": budget_max, "currency": "INR", "available": True},
        "action_lifecycle": ["PROPOSED", "POLICY_CHECK", "AWAITING_APPROVAL"],
    }


def _recommend_session_cross_sell(primary: dict, candidates: list[dict], budget_max: int | None) -> dict | None:
    primary_id = primary.get("id")
    primary_category = primary.get("category")
    primary_price = int(primary.get("price") or 0)
    for candidate in candidates:
        if candidate.get("id") == primary_id:
            continue
        if candidate.get("category") != primary_category:
            continue
        if not candidate.get("availability"):
            continue
        new_total = primary_price + int(candidate.get("price") or 0)
        if budget_max is not None and new_total > budget_max:
            continue
        return {
            "product": candidate,
            "new_total": new_total,
            "within_budget": True,
            "requires_approval": True,
            "decision_summary": "Relevant same-category add-on remains inside the customer's stated budget.",
        }
    return None
