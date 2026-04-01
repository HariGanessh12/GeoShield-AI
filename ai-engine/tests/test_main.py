from fastapi.testclient import TestClient
import sys
import os

# Ensure main can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_risk_score_api():
    payload = {
        "weather": 80.0,
        "traffic": 60.0,
        "location": 90.0,
        "persona_type": "BIKE_TAXI"
    }
    response = client.post("/risk-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "weekly_premium_inr" in data
    assert "breakdown" in data
