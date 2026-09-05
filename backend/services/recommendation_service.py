from __future__ import annotations

from backend.agent.tools import recommend_cross_sell


def recommend_upsell(product_id: str, budget_max: int) -> dict:
    proposal = recommend_cross_sell(product_id, budget_max)
    return {**proposal, "recommendation_type": "cross_sell"}
