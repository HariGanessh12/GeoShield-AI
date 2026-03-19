const express = require('express');
const router = express.Router();
const trustScoreService = require('../services/trustScore');
const Claim = require('../models/claim');

// New endpoint for dashboard to fetch history
router.get('/history', async (req, res) => {
    try {
        const claims = await Claim.find().sort({ createdAt: -1 }).limit(10);
        res.json(claims);
    } catch (e) {
        res.status(500).json({ error: "Could not fetch claims" });
    }
});

router.post('/auto-trigger', async (req, res) => {
    const { workerId, disruptionFactor, userProfile } = req.body;
    
    // Default mock user profile if not passed
    const profile = userProfile || { reputation: 85, claims_history: [100, 120] };
    
    // Base rule check
    if (disruptionFactor.severity < 0.5 && disruptionFactor.type !== 'PLATFORM_OUTAGE') {
        const decision = { 
            status: "REJECTED", 
            trust_score: 100, 
            payout: 0,
            reasons: ["Disruption API severity below payout threshold"] 
        };
        
        // Log rejection to DB
        await Claim.create({
            workerId: workerId || "u101",
            trigger: disruptionFactor.type,
            trustScore: decision.trust_score,
            status: decision.status,
            payout: decision.payout,
            reputationScore: profile.reputation,
            reasons: decision.reasons
        });

        return res.json({ message: "Disruption severity too low.", decision });
    }
    
    // Evaluate trust score mapping to workflows
    const claimDecision = await trustScoreService.evaluateClaim(workerId, disruptionFactor, profile);
    
    // 🥇 Save Claim to MongoDB After Decision
    const payoutAmount = claimDecision.status === 'APPROVED' ? (disruptionFactor.lossAmount || 400) : 0;
    
    await Claim.create({
        workerId: workerId || "u101",
        trigger: disruptionFactor.type,
        trustScore: claimDecision.trust_score,
        status: claimDecision.status,
        payout: payoutAmount,
        reputationScore: profile.reputation,
        reasons: claimDecision.reasons
    });
    
    res.json({
        message: "Claim processing completed",
        decision: claimDecision
    });
});

module.exports = router;
