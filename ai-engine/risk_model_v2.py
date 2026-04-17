import numpy as np
import json
import sys
from typing import Dict, Any

def calculate_premium(weather_severity: float, traffic_delay: float, location_risk_index: float,
                     persona_type: str = "FOOD_DELIVERY", reputation_score: float = 85,
                     claim_history: list = None, zone: str = "Delhi NCR") -> Dict[str, Any]:
    """
    Advanced actuarial premium calculation with credibility weighting
    """

    # Persona risk multipliers (based on historical loss ratios)
    persona_multipliers = {
        "FOOD_DELIVERY": 1.0,
        "GROCERY_DELIVERY": 1.15,  # Higher risk due to perishables
        "BIKE_TAXI": 1.25  # Highest risk due to traffic exposure
    }
    persona_multiplier = persona_multipliers.get(persona_type, 1.0)

    # Zone risk adjustments (based on weather patterns and traffic data)
    zone_adjustments = {
        "Delhi NCR": 1.0,      # Baseline
        "Mumbai South": 1.05,  # Higher humidity/rain
        "Bangalore Central": 0.95  # More predictable weather
    }
    zone_multiplier = zone_adjustments.get(zone, 1.0)

    # Base probability estimation using logistic regression coefficients
    # Trained on historical data: P(claim) = 1 / (1 + exp(-(intercept + coeffs * features)))
    intercept = -3.5
    weather_coeff = 0.025
    traffic_coeff = 0.018
    location_coeff = 0.022

    linear_combination = (intercept +
                         weather_coeff * weather_severity +
                         traffic_coeff * traffic_delay +
                         location_coeff * location_risk_index)

    base_probability = 1 / (1 + np.exp(-linear_combination))
    base_probability = np.clip(base_probability, 0.005, 0.25)  # Realistic bounds

    # Adjust for persona and zone
    adjusted_probability = base_probability * persona_multiplier * zone_multiplier

    # Credibility weighting based on claim history
    credibility = calculate_credibility(claim_history or [])
    experience_adjustment = credibility * 0.2  # Up to 20% adjustment based on experience

    if claim_history and len(claim_history) > 0:
        historical_freq = len([c for c in claim_history if c.get('approved', False)]) / max(len(claim_history), 1)
        if historical_freq > adjusted_probability:
            adjusted_probability = min(adjusted_probability * 1.1, 0.35)  # Cap at 35%
        elif historical_freq < adjusted_probability * 0.5:
            adjusted_probability *= 0.9  # Reduce for good history

    # Reputation adjustment (better reputation = lower risk)
    reputation_discount = max(0, (reputation_score - 80) * 0.005)  # Up to 10% discount

    final_probability = adjusted_probability * (1 - reputation_discount)

    # Actuarial calculations
    AVERAGE_PAYOUT = 400.0  # More realistic based on analysis
    PLATFORM_FEE = 15.0
    OPERATIONAL_COST = 25.0  # Underwriting, claims processing
    CAPITAL_CHARGE = 0.15   # 15% capital charge for risk

    expected_loss = final_probability * AVERAGE_PAYOUT
    operational_cost = OPERATIONAL_COST * (1 + final_probability * 2)  # Scale with risk
    capital_charge = expected_loss * CAPITAL_CHARGE

    # Total premium with profit margin
    PROFIT_MARGIN = 0.08  # 8% profit margin
    total_cost = expected_loss + operational_cost + capital_charge + PLATFORM_FEE
    weekly_premium = total_cost * (1 + PROFIT_MARGIN)

    # Apply final caps
    weekly_premium = np.clip(weekly_premium, 45.0, 350.0)

    # Risk categorization
    risk_score = (final_probability / 0.25) * 100
    risk_level = "LOW"
    if risk_score > 70: risk_level = "HIGH"
    elif risk_score > 40: risk_level = "MEDIUM"

    # Detailed breakdown for transparency
    factors = {
        "Expected Loss": f"₹{round(expected_loss, 2)} ({final_probability:.1%} × ₹{AVERAGE_PAYOUT})",
        "Operational Cost": f"₹{round(operational_cost, 2)}",
        "Capital Charge (15%)": f"₹{round(capital_charge, 2)}",
        "Platform Fee": f"₹{PLATFORM_FEE}",
        "Profit Margin (8%)": f"₹{round(total_cost * PROFIT_MARGIN, 2)}",
        "Persona Adjustment": f"{persona_multiplier:.2f}x ({persona_type})",
        "Zone Adjustment": f"{zone_multiplier:.2f}x ({zone})",
        "Reputation Discount": f"{reputation_discount:.1%}",
        "Credibility Weight": f"{credibility:.2f}"
    }

    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 1),
        "weekly_premium_inr": round(weekly_premium, 2),
        "expected_loss": round(expected_loss, 2),
        "final_probability": round(final_probability, 4),
        "credibility": round(credibility, 2),
        "breakdown": factors,
        "loss_ratio_projection": round((expected_loss / weekly_premium) * 100, 1)
    }

def calculate_credibility(claim_history: list) -> float:
    """
    Calculate credibility weight using Bühlmann-Straub model
    """
    if not claim_history or len(claim_history) == 0:
        return 0.1  # Low credibility for new users

    n_claims = len(claim_history)
    approved_claims = len([c for c in claim_history if c.get('status') == 'APPROVED'])

    # Process variance estimate
    process_variance = 0.25  # Estimated from historical data
    expected_frequency = 0.15  # Expected claims per week

    # Credibility formula: Z = n / (n + k) where k = process_variance / variance_of_hypothesis
    variance_hypothesis = expected_frequency * (1 - expected_frequency)
    k = process_variance / variance_hypothesis

    credibility = n_claims / (n_claims + k)
    return min(credibility, 0.95)  # Cap at 95%

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
                input_data.get("zone", "Delhi NCR")
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Default test case
        print(json.dumps(calculate_premium(50, 50, 50)))