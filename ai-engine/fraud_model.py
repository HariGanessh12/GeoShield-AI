import numpy as np
from sklearn.ensemble import IsolationForest
import json
import sys

# Behavioral anomaly detection logic (Fraud Detection)
def detect_behavioral_anomaly(claim_history, current_claim_amount):
    # claim_history: list of previous claim amounts
    if not claim_history or len(claim_history) < 2:
        return {"anomaly_score": 0.0, "is_anomaly": False, "confidence": 1.0, "reason": "insufficient_history"}
    
    # Train mock isolation forest on user's past claims
    clf = IsolationForest(contamination=0.1, random_state=42)
    X = np.array(claim_history).reshape(-1, 1)
    
    try:
        clf.fit(X)
        current = np.array([[current_claim_amount]])
        prediction = clf.predict(current)
        score = clf.decision_function(current)
        
        is_anomaly = bool(prediction[0] == -1)
        
        return {
            "anomaly_score": float(score[0]),
            "is_anomaly": is_anomaly,
            "confidence": 0.85,
            "reason": "isolation_forest_prediction" if is_anomaly else "normal_activity"
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Input format: '{"history": [100, 150, 120, 110], "current": 500}'
        try:
            data = json.loads(sys.argv[1])
            res = detect_behavioral_anomaly(data.get("history", []), data.get("current", 0))
            print(json.dumps(res))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps(detect_behavioral_anomaly([100, 110, 105], 400)))
