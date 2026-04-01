import numpy as np
import json
import sys

def calculate_premium(weather_severity, traffic_delay, location_risk_index, persona_type="FOOD_DELIVERY"):
    # Persona risk multiplier
    persona_multiplier = 1.0
    if persona_type == "GROCERY_DELIVERY":
        persona_multiplier = 1.2
    elif persona_type == "BIKE_TAXI":
        persona_multiplier = 1.5

    # Base Probability Estimation (Actuarial Model)
    # Mapping severity (0-100) to a rough probability of claim (0.01 - 0.30)
    base_probability = (weather_severity * 0.4 + location_risk_index * 0.3 + traffic_delay * 0.2) / 100.0
    base_probability = min(max(base_probability, 0.01), 0.30)
    
    # Adjust probability by persona risk
    adjusted_probability = base_probability * persona_multiplier

    # Actuarial Constants
    AVERAGE_PAYOUT = 1000.0 # INR
    PLATFORM_FEE = 15.0 # Fixed INR processing
    RISK_MARGIN_PERCENT = 0.30 # 30% margin over expected loss to cover variance

    # Actuarial Formula: Premium = Expected Loss + Risk Margin + Platform Fee
    expected_loss = adjusted_probability * AVERAGE_PAYOUT
    risk_margin = expected_loss * RISK_MARGIN_PERCENT
    
    weekly_premium = expected_loss + risk_margin + PLATFORM_FEE
    
    # Cap premiums realistically
    weekly_premium = min(max(weekly_premium, 50.0), 300.0)
    
    # Explainability breakdown (Game Changer for Pricing)
    factors = {
        "Expected Loss (Probability x Payout)": f"₹{round(expected_loss, 2)}",
        "Risk Margin (30%)": f"₹{round(risk_margin, 2)}",
        "Platform Fee": f"₹{PLATFORM_FEE}",
        "Persona Multiplier Applied": f"{persona_multiplier}x ({persona_type})"
    }
    
    risk_score = (adjusted_probability / 0.30) * 100 # Normalize to 100
    risk_level = "LOW"
    if risk_score > 60: risk_level = "HIGH"
    elif risk_score > 30: risk_level = "MEDIUM"
    
    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 2),
        "weekly_premium_inr": round(weekly_premium, 2),
        "expected_loss": round(expected_loss, 2),
        "risk_margin": round(risk_margin, 2),
        "breakdown": factors
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = calculate_premium(
                input_data.get("weather", 0),
                input_data.get("traffic", 0),
                input_data.get("location", 0),
                input_data.get("persona_type", "FOOD_DELIVERY")
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps(calculate_premium(50, 50, 50)))
