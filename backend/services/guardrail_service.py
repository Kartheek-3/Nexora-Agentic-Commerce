from __future__ import annotations


DEFAULT_GUARDRAILS = {
    "maximum_transaction_value": 10000,
    "maximum_discount_percentage": 15,
    "maximum_campaign_spend": 25000,
    "allow_ai_cart_editing": True,
    "allow_ai_upselling": True,
    "allow_ai_cross_selling": True,
    "allow_automatic_campaign_generation": True,
    "allow_automatic_campaign_sending": False,
    "require_payment_authorization": True,
    "maximum_recommended_cart_value": 8000,
    "allowed_agent_tools": ["search_catalog", "get_product", "compare_products", "create_cart", "recommend_cross_sell", "request_checkout"],
}


def simulate_policy(action_type: str, amount: int = 0, discount_percent: int = 0, category: str = "") -> dict:
    violations: list[dict] = []
    warnings: list[dict] = []

    if action_type in {"checkout", "request_checkout", "create_order"} and amount > DEFAULT_GUARDRAILS["maximum_transaction_value"]:
        violations.append({"rule": "max_transaction_value", "actual": amount, "allowed": DEFAULT_GUARDRAILS["maximum_transaction_value"]})
    if action_type in {"recommendation", "cart_edit", "request_checkout"} and amount > DEFAULT_GUARDRAILS["maximum_recommended_cart_value"]:
        warnings.append({"rule": "max_recommended_cart_value", "actual": amount, "allowed": DEFAULT_GUARDRAILS["maximum_recommended_cart_value"]})
    if discount_percent > DEFAULT_GUARDRAILS["maximum_discount_percentage"]:
        violations.append({"rule": "max_discount_percentage", "actual": discount_percent, "allowed": DEFAULT_GUARDRAILS["maximum_discount_percentage"]})
    if category and category not in DEFAULT_GUARDRAILS.get("allowed_categories", []):
        warnings.append({"rule": "category_allow_list", "actual": category, "allowed": DEFAULT_GUARDRAILS.get("allowed_categories", [])})
    if action_type == "cart_edit" and not DEFAULT_GUARDRAILS["allow_ai_cart_editing"]:
        violations.append({"rule": "allow_ai_cart_editing", "actual": False, "allowed": True})
    if action_type == "cross_sell" and not DEFAULT_GUARDRAILS["allow_ai_cross_selling"]:
        violations.append({"rule": "allow_ai_cross_selling", "actual": False, "allowed": True})

    passed = not violations
    risk_level = "HIGH" if violations else "MEDIUM" if warnings else "LOW"
    requires_approval = DEFAULT_GUARDRAILS["require_payment_authorization"] and passed
    return {
        "passed": passed,
        "decision": "blocked" if not passed else "authorization_required" if requires_approval else "allowed",
        "risk_level": risk_level,
        "requires_approval": requires_approval,
        "requires_authorization": requires_approval,
        "decision_summary": "Policy simulation passed." if passed else "Policy simulation blocked the action.",
        "action_type": action_type,
        "amount": amount,
        "discount_percent": discount_percent,
        "category": category,
        "violations": violations,
        "warnings": warnings,
        "applied_limits": {
            "maximum_transaction_value": DEFAULT_GUARDRAILS["maximum_transaction_value"],
            "maximum_discount_percentage": DEFAULT_GUARDRAILS["maximum_discount_percentage"],
            "maximum_recommended_cart_value": DEFAULT_GUARDRAILS["maximum_recommended_cart_value"],
        },
    }


def check_checkout(total: int) -> dict:
    decision = simulate_policy("checkout", amount=total)
    decision["decision_summary"] = "Cart total is within merchant transaction limit." if decision["passed"] else "Cart total exceeds merchant transaction limit."
    return decision
