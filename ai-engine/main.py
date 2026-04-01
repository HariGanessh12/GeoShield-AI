from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import sys
import os

# Import local ML functions
from fraud_model import detect_behavioral_anomaly
from risk_model import calculate_premium
from graph_detection import detect_coordinated_attack

app = FastAPI(title="GeoShield-AI ML Engine", version="1.0.0", description="FastAPI microservice for executing heavy ML calculations asynchronously.")

class FraudRequest(BaseModel):
    history: List[float]
    current: float

class RiskRequest(BaseModel):
    weather: float = 50.0
    traffic: float = 50.0
    location: float = 50.0
    persona_type: str = "FOOD_DELIVERY"

class GraphRequest(BaseModel):
    nodes: List[str]
    edges: List[List[str]]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "GeoShield-AI FastAPI"}

@app.post("/fraud-detect")
def fraud_detect(req: FraudRequest):
    try:
        result = detect_behavioral_anomaly(req.history, req.current)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk-score")
def risk_score(req: RiskRequest):
    try:
        result = calculate_premium(req.weather, req.traffic, req.location, req.persona_type)
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/graph-detect")
def graph_detect(req: GraphRequest):
    try:
        # convert edge lists to tuples
        edges_list = [tuple(e) for e in req.edges]
        result = detect_coordinated_attack(req.nodes, edges_list)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Port 8001 ensures it runs alongside Node.js which is on 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
