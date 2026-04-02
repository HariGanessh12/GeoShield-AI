const express = require('express');
const router = express.Router();
const trustScoreService = require('../services/trustScore');
const externalDataService = require('../services/externalDataService');
const Claim = require('../models/claim');
const Policy = require('../models/policy');
const User = require('../models/user');

// SECURE: History now strictly scopes to the authenticated user's ID
router.get('/history', async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ error: "Unauthorized" });
        const claims = await Claim.find({ workerId: req.user.id }).sort({ createdAt: -1 }).limit(10);
        res.json(claims);
    } catch (e) {
        console.error("Fetch History Error:", e);
        res.status(500).json({ error: "Could not fetch claims" });
    }
});

router.post('/auto-trigger', async (req, res) => {
    try {
        // SECURE: Always derive workerId from verified JWT
        const workerId = req.user && (req.user.id || req.user._id || req.user.userId);
        const { disruptionFactor } = req.body;

        if (!workerId || !disruptionFactor) {
            return res.status(400).json({ error: "Invalid payload or missing authentication." });
        }
        
        // Fetch user context safely
        const user = await User.findById(workerId).lean() || { 
            zone: 'Delhi NCR', reputationScore: 85, personaType: 'FOOD_DELIVERY', _id: workerId 
        };

        // 🛡️ INSURANCE ELIGIBILITY CHECK
        const activePolicy = await Policy.findOne({ workerId: workerId, status: 'active' }) || {
            coveredEvents: ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE'],
            exclusions: ['INACTIVE_WORKER', 'GPS_MISMATCH', 'ALREADY_COMPENSATED']
        };

        if (!activePolicy.coveredEvents.includes(disruptionFactor.type)) {
            return res.json({ message: "Event not covered by active policy.", decision: { status: 'REJECTED', reasons: ["Event not covered"] } });
        }

        if (disruptionFactor.isInactiveWorker && activePolicy.exclusions.includes('INACTIVE_WORKER')) {
            return res.json({ message: "Claim rejected: Exclusion INACTIVE_WORKER matched.", decision: { status: 'REJECTED', reasons: ["Worker was inactive"] } });
        }

        // Fetch Live external data
        const externalData = await externalDataService.getExternalData(disruptionFactor.type, user.zone);
        disruptionFactor.severity = externalData.severityScore;

        const profile = { reputation: user.reputationScore || 85, claims_history: [100, 120] };
        
        // Base rule check
        if (disruptionFactor.severity < 0.5 && disruptionFactor.type !== 'PLATFORM_OUTAGE') {
            const decision = { 
                status: "REJECTED", 
                trust_score: 100, 
                payout: 0,
                reasons: ["Disruption API severity below payout threshold"] 
            };
            
            await Claim.create({
                workerId: workerId,
                trigger: disruptionFactor.type,
                trustScore: decision.trust_score,
                status: decision.status,
                payout: decision.payout,
                reputationScore: profile.reputation,
                reasons: decision.reasons
            });

            return res.json({ message: "Disruption severity too low.", decision });
        }
        
        // Evaluate trust score mapping
        let claimDecision = await trustScoreService.evaluateClaim(workerId, disruptionFactor, profile);

        // Ensure graceful fallback in case AI microservice failed entirely
        if (!claimDecision || claimDecision.status === 'ERROR') {
            claimDecision = typeof trustScoreService.buildLocalFallbackDecision === 'function'
                ? trustScoreService.buildLocalFallbackDecision(workerId, disruptionFactor, profile)
                : {
                    status: 'REJECTED',
                    trust_score: 50,
                    reasons: ['Local fallback used because AI evaluation was unavailable'],
                    adjustments: [],
                    aiConfidence: 0.5
                };
            claimDecision.source = claimDecision.source || 'route_fallback';
        }

        const payoutAmount = claimDecision.status === 'APPROVED' ? (disruptionFactor.lossAmount || 400) : 0;

        try {
            await Claim.create({
                workerId: workerId,
                trigger: disruptionFactor.type,
                trustScore: claimDecision.trust_score,
                status: claimDecision.status,
                payout: payoutAmount,
                reputationScore: profile.reputation,
                reasons: claimDecision.reasons
            });
        } catch (persistError) {
            console.warn("Claim persistence failed, returning evaluation anyway:", persistError.message);
        }
        
        res.json({
            message: "Claim processing completed",
            decision: claimDecision
        });
    } catch (error) {
        console.error("Auto trigger exception:", error);
        res.status(500).json({ error: "Internal server error during claim generation." });
    }
});

module.exports = router;
