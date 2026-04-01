async function evaluateClaim(workerId, disruptionFactor, userProfile) {
    try {
        // Construct promises for parallel execution to avoid blocking
        const fraudFetchOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history: userProfile.claims_history || [100, 150, 100],
                current: disruptionFactor.lossAmount || 200
            })
        };
        
        // Mock payload for graph detection
        const graphFetchOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nodes: ["u1", "u2", "u3", "u4", workerId],
                edges: [["u1", "u2"], ["u2", "u3"], ["u3", workerId]] // Suspicious linked devices/IPs
            })
        };

        const [fraudResponse, graphResponse] = await Promise.all([
            fetch("http://localhost:8001/fraud-detect", fraudFetchOptions),
            fetch("http://localhost:8001/graph-detect", graphFetchOptions)
        ]);

        if (!fraudResponse.ok || !graphResponse.ok) {
            throw new Error(`FastAPI Dependency Failure. Fraud: ${fraudResponse.statusText}, Graph: ${graphResponse.statusText}`);
        }
        
        const fraudAnalysis = await fraudResponse.json();
        const graphAnalysis = await graphResponse.json();
        
        let trustScore = 100;
        let reasons = [];
        let adjustments = [];
        
        reasons.push(`Verified ${disruptionFactor.type} parametric trigger`);
        
        // 1. ML FRAUD PENALTY
        if (fraudAnalysis.is_anomaly) {
            trustScore -= 35;
            reasons.push("Behavioral anomaly detected in historical claims");
            adjustments.push({ factor: "AI Fraud Penalty", delta: -35 });
        } else {
            reasons.push("Claim pattern is historically consistent");
        }
        
        // 2. GRAPH DETECTION PENALTY (Syndicated Attack)
        if (graphAnalysis.network_risk_level === 'HIGH' && graphAnalysis.ring_count > 0) {
            trustScore -= 45;
            reasons.push("Suspicious IP/Device clustering detected (Ring Association)");
            adjustments.push({ factor: "Coordinated Attack Flag", delta: -45 });
        }
        
        // 3. RULE MATCH PENALTY
        if (disruptionFactor.location_mismatch) {
            trustScore -= 35;
            reasons.push("GPS-IP mismatch detected during claim window");
            adjustments.push({ factor: "GPS Mismatch Penalty", delta: -35 });
        }
        
        // 4. FAIRNESS LAYER (Reputation)
        const reputation = userProfile.reputation || 85;
        if (reputation > 80) {
            trustScore += 10;
            reasons.push(`+10 Trust Bonus: Excellent worker reputation (${reputation}/100)`);
            adjustments.push({ factor: "Reputation Bonus", delta: 10 });
        }
        
        // 5. GRACE BUFFER
        if (trustScore >= 40 && trustScore < 50 && reputation > 70) {
            trustScore = 50; 
            reasons.push("Grace Buffer applied for tenured worker.");
            adjustments.push({ factor: "Grace Buffer Adjustment", delta: 50 - trustScore });
        }
        
        trustScore = Math.min(100, Math.max(0, trustScore));

        let decision = 'REJECTED';
        if (trustScore >= 80) decision = 'APPROVED';
        else if (trustScore >= 50) decision = 'VERIFY'; // Flagged for appeal
        
        return { 
            status: decision, 
            trust_score: trustScore,
            aiConfidence: fraudAnalysis.confidence || 0.85,
            adjustments: adjustments,
            reasons: reasons,
            payout: decision === 'APPROVED' ? 'Instant UPI Payout' : (decision === 'VERIFY' ? 'Pending Manual Appeal' : 'None')
        };
        
    } catch (err) {
        console.error("AI Engine API execution failed:", err.message);
        return { status: 'ERROR', message: 'Evaluation failed', reasons: [] };
    }
}

module.exports = { evaluateClaim };
