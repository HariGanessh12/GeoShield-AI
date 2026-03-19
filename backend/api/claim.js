const express = require('express');
const router = express.Router();
const trustScoreService = require('../services/trustScore');

router.post('/auto-trigger', async (req, res) => {
    const { workerId, disruptionFactor, userProfile } = req.body;
    
    // Default mock user profile if not passed
    const profile = userProfile || { reputation: 85, claims_history: [100, 120] };
    
    // Base rule check
    if (disruptionFactor.severity < 0.5 && disruptionFactor.type !== 'PLATFORM_OUTAGE') {
        return res.json({ 
            message: "Disruption severity too low.", 
            decision: { 
                status: "REJECTED", 
                trust_score: 100, 
                reasons: ["Disruption API severity below payout threshold"] 
            } 
        });
    }
    
    // Evaluate trust score mapping to workflows
    const claimDecision = await trustScoreService.evaluateClaim(workerId, disruptionFactor, profile);
    
    res.json({
        message: "Claim processing completed",
        decision: claimDecision
    });
});

module.exports = router;
