import numpy as np
from sklearn.linear_model import LogisticRegression
import json
import sys

def calculate_premium(weather_severity, traffic_delay, location_risk_index):
    base_premium = 50.0 # INR
    
    weather_risk = weather_severity * 0.4
    location_risk = location_risk_index * 0.3
    traffic_risk = traffic_delay * 0.2
    
    risk_score = weather_risk + location_risk + traffic_risk
    
    weekly_premium = base_premium + (risk_score * 2.5)
    weekly_premium = min(max(weekly_premium, 50.0), 300.0)
    
    # Explainability breakdown (Game Changer for Pricing)
    factors = {
        "Base Premium": f"₹{base_premium}",
        "Weather Risk": f"+₹{round(weather_risk * 2.5, 2)}",
        "Location Risk": f"+₹{round(location_risk * 2.5, 2)}",
        "Traffic / History": f"+₹{round(traffic_risk * 2.5, 2)}"
    }
    
    risk_level = "LOW"
    if risk_score > 60: risk_level = "HIGH"
    elif risk_score > 30: risk_level = "MEDIUM"
    
    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 2),
        "weekly_premium_inr": round(weekly_premium, 2),
        "breakdown": factors
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = calculate_premium(
                input_data.get("weather", 0),
                input_data.get("traffic", 0),
                input_data.get("location", 0)
            )
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps(calculate_premium(50, 50, 50)))
