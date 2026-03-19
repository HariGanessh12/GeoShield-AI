const { execSync } = require('child_process');
const path = require('path');

async function evaluateClaim(workerId, disruptionFactor, userProfile) {
    try {
        const inputData = JSON.stringify({
            history: userProfile.claims_history || [100, 150, 100],
            current: disruptionFactor.lossAmount || 200
        });
        
        const escapedInput = inputData.replace(/"/g, '\\"');
        const scriptPath = path.resolve(__dirname, '../../ai-engine/fraud_model.py');
        
        const pythonResult = execSync(`python "${scriptPath}" "${escapedInput}"`).toString();
        const fraudAnalysis = JSON.parse(pythonResult);
        
        let trustScore = 100;
        let reasons = [];
        
        reasons.push(`Verified ${disruptionFactor.type} parametric trigger (Severity API match)`);
        
        // ML Fraud Check
        if (fraudAnalysis.is_anomaly) {
            trustScore -= 35;
            reasons.push("Behavioral anomaly detected in historical claim patterns");
        } else {
            reasons.push("Claim pattern is historically consistent");
        }
        
        // Rule-based Mismatch
        if (disruptionFactor.location_mismatch) {
            trustScore -= 35;
            reasons.push("GPS-IP mismatch detected during claim window");
        }
        
        // 🥇 Fairness Layer
        const reputation = userProfile.reputation || 85;
        if (reputation > 80) {
            trustScore += 10;
            reasons.push(`+10 Trust Bonus: Excellent worker reputation (${reputation}/100)`);
        }
        
        // 🥇 Grace Buffer
        if (trustScore >= 40 && trustScore < 50 && reputation > 70) {
            trustScore = 50; 
            reasons.push("Grace Buffer applied for tenured worker.");
        }
        
        trustScore = Math.min(100, Math.max(0, trustScore));

        let decision = 'REJECTED';
        if (trustScore >= 80) decision = 'APPROVED';
        else if (trustScore >= 50) decision = 'VERIFY'; // Flagged for appeal
        
        return { 
            status: decision, 
            trust_score: trustScore,
            reasons: reasons,
            payout: decision === 'APPROVED' ? 'Instant UPI Payout' : (decision === 'VERIFY' ? 'Pending Manual Appeal' : 'None')
        };
        
    } catch (err) {
        console.error("AI Engine execution failed:", err.message);
        return { status: 'ERROR', message: 'Evaluation failed', reasons: [] };
    }
}

module.exports = { evaluateClaim };
