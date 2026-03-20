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

const User = require('../models/user');

router.post('/auto-trigger', async (req, res) => {
    const { workerId, disruptionFactor } = req.body;
    
    // Fetch user to apply specific Zone risks
    let user;
    try {
        if (workerId !== 'u101') user = await User.findById(workerId);
    } catch(e) {}
    
    if (!user) user = { zone: 'Delhi NCR', reputationScore: 85, _id: workerId || "u101" };

    const profile = { reputation: user.reputationScore || 85, claims_history: [100, 120] };
    
    // Dynamic Weather severity mock based on chosen DB zone
    let severity = disruptionFactor.severity || 0.80;
    if (user.zone === 'Mumbai South' && disruptionFactor.type === 'HEAVY_RAIN') severity = 0.95;
    if (user.zone === 'Delhi NCR' && disruptionFactor.type === 'HEATWAVE') severity = 0.92;
    if (user.zone === 'Bangalore Central' && disruptionFactor.type === 'PLATFORM_OUTAGE') severity = 0.88;
    
    disruptionFactor.severity = severity;
    
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
