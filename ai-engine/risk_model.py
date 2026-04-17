import json
import math
import os
import sys


CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "shared", "pricing-config.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as handle:
    PRICING_CONFIG = json.load(handle)


def calculate_credibility(claim_history=None):
    claim_history = claim_history or []
    if not claim_history:
        return 0.1

    approved = len([claim for claim in claim_history if claim.get("status") == "APPROVED"])
    n_claims = len(claim_history)
    historical_frequency = approved / n_claims if n_claims else 0.0
    variance_hypothesis = historical_frequency * (1 - historical_frequency or 1)
    if variance_hypothesis <= 0:
        return 0.95
    credibility = n_claims / (n_claims + (0.25 / variance_hypothesis))
    return min(max(credibility, 0.1), 0.95)


def calculate_premium(weather_severity, traffic_delay, location_risk_index, persona_type="FOOD_DELIVERY",
                      reputation_score=85, claim_history=None, zone="Delhi NCR", avg_payout_per_event=None):
    claim_history = claim_history or []
    avg_payout = avg_payout_per_event or PRICING_CONFIG["averagePayoutDefault"]
    persona_multiplier = PRICING_CONFIG["personaMultipliers"].get(persona_type, 1.0)
    zone_multiplier = PRICING_CONFIG["zoneAdjustments"].get(zone, 1.0)

    linear_combination = (
        PRICING_CONFIG["intercept"]
        + PRICING_CONFIG["weatherCoefficient"] * weather_severity
        + PRICING_CONFIG["trafficCoefficient"] * traffic_delay
        + PRICING_CONFIG["locationCoefficient"] * location_risk_index
    )
    claim_probability = 1 / (1 + math.exp(-linear_combination))
    claim_probability = min(max(claim_probability, PRICING_CONFIG["minimumProbability"]), PRICING_CONFIG["maximumProbability"])
    claim_probability *= persona_multiplier * zone_multiplier

    credibility = calculate_credibility(claim_history)
    if claim_history:
        approved = len([claim for claim in claim_history if claim.get("status") == "APPROVED"])
        historical_frequency = approved / len(claim_history)
        claim_probability = (claim_probability * (1 - credibility)) + (historical_frequency * credibility)

    reputation_discount = max(0, (reputation_score - 80) * 0.005)
    claim_probability *= (1 - reputation_discount)
    claim_probability = min(max(claim_probability, PRICING_CONFIG["minimumProbability"]), PRICING_CONFIG["maximumProbability"])

    expected_loss = claim_probability * avg_payout
    risk_adjustment = expected_loss * PRICING_CONFIG["riskMarginRate"]
    platform_fee = PRICING_CONFIG["platformFee"]
    final_premium = max(PRICING_CONFIG["minimumPremium"], expected_loss + risk_adjustment + platform_fee)
    risk_score = round((claim_probability / PRICING_CONFIG["maximumProbability"]) * 100, 1)

    risk_level = "LOW"
    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"

    rounded_expected_loss = round(expected_loss, 2)
    rounded_risk_adjustment = round(risk_adjustment, 2)
    rounded_final_premium = round(final_premium, 2)

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "weekly_premium_inr": rounded_final_premium,
        "expected_loss": rounded_expected_loss,
        "risk_margin": rounded_risk_adjustment,
        "base_premium": rounded_expected_loss,
        "risk_adjustment": rounded_risk_adjustment,
        "platform_fee": round(platform_fee, 2),
        "final_premium": rounded_final_premium,
        "breakdown": {
            "base_premium": rounded_expected_loss,
            "risk_adjustment": rounded_risk_adjustment,
            "platform_fee": round(platform_fee, 2),
            "final_premium": rounded_final_premium
        }
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = calculate_premium(
                input_data.get("weather", 0),
                input_data.get("traffic", 0),
                input_data.get("location", 0),
                input_data.get("persona_type", "FOOD_DELIVERY"),
                input_data.get("reputation_score", 85),
                input_data.get("claim_history", []),
                input_data.get("zone", "Delhi NCR"),
                input_data.get("avg_payout_per_event")
            )
            print(json.dumps(result))
        except Exception as exc:
            print(json.dumps({"error": str(exc)}))
    else:
        print(json.dumps(calculate_premium(50, 50, 50)))
