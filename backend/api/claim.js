const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const trustScoreService = require('../services/trustScore');
const externalDataService = require('../services/externalDataService');
const Claim = require('../models/claim');
const Policy = require('../models/policy');
const User = require('../models/user');
const { sendSuccess, sendError } = require('../utils/http');
const { buildTriggerFeed, evaluateTriggerEligibility, selectRecommendedTrigger } = require('../services/triggerEngine');
const payoutService = require('../services/payoutService');

function getWorkerId(req) {
    const candidate = req.user && (req.user.id || req.user._id || req.user.userId);
    if (!candidate) return null;
    const workerId = String(candidate);
    return mongoose.Types.ObjectId.isValid(workerId) ? workerId : null;
}

function normalizePolicy(policy) {
    const fallbackCoveredEvents = ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE', 'AQI_SEVERE', 'TRAFFIC_SURGE'];
    const fallbackExclusions = ['INACTIVE_WORKER', 'GPS_MISMATCH', 'ALREADY_COMPENSATED'];
    const source = policy || {};

    return {
        ...source,
        coveredEvents: Array.isArray(source.coveredEvents) && source.coveredEvents.length > 0
            ? source.coveredEvents
            : fallbackCoveredEvents,
        exclusions: Array.isArray(source.exclusions) && source.exclusions.length > 0
            ? source.exclusions
            : fallbackExclusions
    };
}

async function processClaimForWorker({
    workerId,
    disruptionFactor,
    userRecord,
    activePolicy,
    source = 'manual_trigger',
    triggerSnapshot = null
}) {
    const recentClaims = await Claim.find({ workerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('claimAmount payout')
        .lean()
        .catch((err) => {
            console.warn("Claim history lookup failed, continuing without history:", err.message);
            return [];
        });

    const claimsHistory = recentClaims
        .map((claim) => Number.isFinite(Number(claim.claimAmount)) ? Number(claim.claimAmount) : Number(claim.payout))
        .filter((amount) => Number.isFinite(amount) && amount > 0);

    if (!activePolicy.coveredEvents.includes(disruptionFactor.type)) {
        return {
            message: "Event not covered by active policy.",
            decision: { status: 'REJECTED', reasons: ["Event not covered"] }
        };
    }

    if (disruptionFactor.isInactiveWorker && activePolicy.exclusions.includes('INACTIVE_WORKER')) {
        return {
            message: "Claim rejected: Exclusion INACTIVE_WORKER matched.",
            decision: { status: 'REJECTED', reasons: ["Worker was inactive"] }
        };
    }

    const externalData = await externalDataService.getExternalData(disruptionFactor.type, userRecord.zone);
    disruptionFactor.severity = externalData.severityScore;

    const profile = { reputation: userRecord.reputationScore || 85, claims_history: claimsHistory };

    if (disruptionFactor.severity < 0.5 && disruptionFactor.type !== 'PLATFORM_OUTAGE') {
        const decision = {
            status: "REJECTED",
            trust_score: 100,
            payout: 0,
            reasons: ["Disruption API severity below payout threshold"]
        };

        await Claim.create({
            workerId,
            trigger: disruptionFactor.type,
            claimAmount: disruptionFactor.lossAmount || 0,
            trustScore: decision.trust_score,
            status: decision.status,
            payout: decision.payout,
            reputationScore: profile.reputation,
            reasons: decision.reasons,
            source,
            triggerSnapshot
        });

        return { message: "Disruption severity too low.", decision };
    }

    let claimDecision = await trustScoreService.evaluateClaim(workerId, disruptionFactor, profile);

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

    const savedClaim = await Claim.create({
        workerId,
        trigger: disruptionFactor.type,
        claimAmount: disruptionFactor.lossAmount || 0,
        trustScore: claimDecision.trust_score,
        status: claimDecision.status,
        payout: payoutAmount,
        reputationScore: profile.reputation,
        reasons: claimDecision.reasons,
        source,
        triggerSnapshot
    });

    if (savedClaim.status === 'APPROVED') {
        try {
            await payoutService.processPayout(savedClaim);
        } catch (err) {
            console.error("Payout processing error:", err);
        }
    }

    return {
        message: "Claim processing completed",
        decision: claimDecision
    };
}

// SECURE: History now strictly scopes to the authenticated user's ID
router.get('/history', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) return sendError(res, 401, "Unauthorized");
        const claims = await Claim.find({ workerId }).sort({ createdAt: -1 }).limit(10);
        return sendSuccess(res, claims);
    } catch (e) {
        console.error("Fetch History Error:", e);
        return sendError(res, 500, "Could not fetch claims");
    }
});

router.post('/auto-trigger', async (req, res) => {
    try {
        // SECURE: Always derive workerId from verified JWT
        const workerId = getWorkerId(req);
        const { disruptionFactor, location, deviceInfo } = req.body;

        if (!workerId) {
            return sendError(res, 401, "Invalid or missing authentication.");
        }

        if (!disruptionFactor || typeof disruptionFactor !== 'object' || !disruptionFactor.type) {
            return sendError(res, 400, "Invalid payload or missing authentication.");
        }
        
        // Fetch user context safely
        const userRecord = await User.findById(workerId).lean().catch((err) => {
            console.warn("User lookup failed, using fallback profile:", err.message);
            return null;
        });
        const user = userRecord || {
            zone: 'Delhi NCR',
            reputationScore: 85,
            personaType: 'FOOD_DELIVERY',
            _id: workerId
        };

        const recentClaims = await Claim.find({ workerId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('claimAmount payout')
            .lean()
            .catch((err) => {
                console.warn("Claim history lookup failed, continuing without history:", err.message);
                return [];
            });

        const claimsHistory = recentClaims
            .map((claim) => Number.isFinite(Number(claim.claimAmount)) ? Number(claim.claimAmount) : Number(claim.payout))
            .filter((amount) => Number.isFinite(amount) && amount > 0);

        // 🛡️ INSURANCE ELIGIBILITY CHECK
        const activePolicy = normalizePolicy(await Policy.findOne({ workerId, status: 'active' }).lean().catch((err) => {
            console.warn("Policy lookup failed, using fallback policy:", err.message);
            return null;
        }));

        if (!activePolicy.coveredEvents.includes(disruptionFactor.type)) {
            return sendSuccess(res, {
                message: "Event not covered by active policy.",
                decision: { status: 'REJECTED', reasons: ["Event not covered"] }
            });
        }

        if (disruptionFactor.isInactiveWorker && activePolicy.exclusions.includes('INACTIVE_WORKER')) {
            return sendSuccess(res, {
                message: "Claim rejected: Exclusion INACTIVE_WORKER matched.",
                decision: { status: 'REJECTED', reasons: ["Worker was inactive"] }
            });
        }

        // Fetch Live external data
        const externalData = await externalDataService.getExternalData(disruptionFactor.type, user.zone);
        disruptionFactor.severity = externalData.severityScore;

        const profile = { reputation: user.reputationScore || 85, claims_history: claimsHistory };
        
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
                policyId: activePolicy._id,
                trigger: disruptionFactor.type,
                amount: disruptionFactor.lossAmount || 0,
                trustScore: decision.trustScore,
                status: decision.status,
                payout: decision.payout,
                reputationScore: profile.reputation,
                reasons: decision.reasons,
                adjustments: decision.adjustments,
                location: location || { zone: user.zone },
                deviceInfo: deviceInfo || {},
                externalData
            });

            return sendSuccess(res, { message: "Disruption severity too low.", decision });
        }
        
        // Create claim object for scoring
        const claim = new Claim({
            workerId: workerId,
            policyId: activePolicy._id,
            trigger: disruptionFactor.type,
            amount: disruptionFactor.lossAmount || Math.min(activePolicy.maxPayoutPerEvent, activePolicy.coverageAmount * 0.1),
            location: location || { zone: user.zone },
            deviceInfo: deviceInfo || {},
            externalData
        });

        // Evaluate trust score
        const scoringResult = await trustScoreService.scoreClaim(claim, profile);

        claim.trustScore = scoringResult.trustScore;
        claim.adjustments = scoringResult.adjustments;
        claim.reasons = scoringResult.reasons;
        claim.status = scoringResult.status;

        if (scoringResult.status === 'APPROVED') {
            claim.payout = claim.amount;
            try {
                await payoutService.processPayout(claim);
            } catch (err) {
                console.error("Payout error:", err);
                claim.status = 'VERIFY'; // Require manual review if payout fails
                claim.resolutionNote = `Auto-approved but payout failed: ${err.message}`;
            }
        }

        await claim.save();
        
        return sendSuccess(res, {
            message: "Claim processing completed",
            decision: claimDecision
        });
    } catch (error) {
        console.error("Auto trigger exception:", error);
        try {
            const workerId = getWorkerId(req);
            const disruptionFactor = req.body && req.body.disruptionFactor;
            const fallbackProfile = {
                reputation: 85,
                claims_history: []
            };

            if (workerId && disruptionFactor && typeof disruptionFactor === 'object' && disruptionFactor.type) {
                const fallbackDecision = typeof trustScoreService.buildLocalFallbackDecision === 'function'
                    ? trustScoreService.buildLocalFallbackDecision(workerId, disruptionFactor, fallbackProfile)
                    : {
                        status: 'REJECTED',
                        trust_score: 50,
                        reasons: ['Emergency fallback used because claim generation failed'],
                        adjustments: [],
                        aiConfidence: 0.5,
                        source: 'emergency_fallback'
                    };

                return sendSuccess(res, {
                    message: "Claim processing completed with local fallback",
                    decision: fallbackDecision
                });
            }
        } catch (fallbackError) {
            console.error("Emergency fallback also failed:", fallbackError);
        }

        return sendError(res, 500, "Internal server error during claim generation.");
    }
});

router.post('/zero-touch-scan', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) {
            return sendError(res, 401, "Invalid or missing authentication.");
        }

        const user = await User.findById(workerId).lean();
        if (!user) {
            return sendError(res, 404, "Worker not found");
        }

        // Get policy with error handling
        let policy = { shiftState: 'OFF' };
        try {
            const dbPolicy = await Policy.findOne({ workerId, status: 'active' }).lean();
            policy = normalizePolicy(dbPolicy);
        } catch (err) {
            console.warn('[Claim/ZeroTouch] Failed to fetch policy:', err.message);
            // Continue with default policy
        }

        const shiftState = policy.shiftState || 'OFF';
        
        // Build trigger feed with error handling
        let feed = [];
        let recommendedTrigger = null;
        try {
            const rawFeed = await buildTriggerFeed(user.zone);
            feed = evaluateTriggerEligibility(rawFeed || [], policy, shiftState);
            recommendedTrigger = selectRecommendedTrigger(feed);
        } catch (err) {
            console.error('[Claim/ZeroTouch] Failed to build trigger feed:', err.message);
            // Return success but no auto-claim instead of 500 error
            return sendSuccess(res, {
                message: "Could not evaluate triggers at this time. Please file a manual claim.",
                automated: false,
                triggers: [],
                _meta: { error: 'trigger_evaluation_failed' }
            });
        }

        if (!recommendedTrigger) {
            return sendSuccess(res, {
                message: shiftState !== 'ON'
                    ? "No zero-touch claim created because shift coverage is OFF."
                    : "No eligible trigger crossed the auto-claim threshold.",
                automated: false,
                triggers: feed
            });
        }

        // Process claim with error handling
        let result;
        try {
            result = await processClaimForWorker({
                workerId,
                disruptionFactor: {
                    type: recommendedTrigger.type,
                    lossAmount: recommendedTrigger.lossAmount
                },
                userRecord: user,
                activePolicy: policy,
                source: 'zero_touch_scan',
                triggerSnapshot: recommendedTrigger
            });
        } catch (err) {
            console.error('[Claim/ZeroTouch] Claim processing failed:', err.message);
            // Return success but indicate processing failed
            return sendSuccess(res, {
                message: "Claim processing failed. Manual review required.",
                automated: false,
                triggers: feed,
                recommendedTrigger,
                _meta: { error: 'claim_processing_failed' }
            });
        }

        return sendSuccess(res, {
            ...result,
            automated: true,
            recommendedTrigger,
            triggers: feed
        });
    } catch (error) {
        console.error('[Claim/ZeroTouch] Unhandled error:', error.message, error.stack);
        // Return 503 Service Unavailable instead of 500
        return sendError(res, 503, "Zero-touch scan service temporarily unavailable. Please try again.");
    }
});

router.get('/triggers/feed', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) {
            return sendError(res, 401, "Invalid or missing authentication.");
        }

        const user = await User.findById(workerId).lean();
        if (!user) {
            return sendError(res, 404, "Worker not found");
        }

        // Get policy with error handling
        let policy = { shiftState: 'OFF' };
        try {
            const dbPolicy = await Policy.findOne({ workerId, status: 'active' }).lean();
            policy = normalizePolicy(dbPolicy);
        } catch (err) {
            console.warn('[Claim/Triggers] Failed to fetch policy:', err.message);
            // Continue with default policy - not critical
        }

        // Build trigger feed with error handling
        let feed = [];
        try {
            const rawFeed = await buildTriggerFeed(user.zone);
            feed = evaluateTriggerEligibility(rawFeed || [], policy, policy.shiftState || 'OFF');
        } catch (err) {
            console.error('[Claim/Triggers] Failed to build trigger feed:', err.message);
            // Return empty triggers instead of 500 error
            feed = [];
        }

        const shiftState = policy.shiftState || 'OFF';

        return sendSuccess(res, {
            workerId,
            zone: user.zone,
            shiftState,
            triggers: feed,
            _meta: {
                dataSource: feed.length > 0 ? 'live' : 'degraded',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[Claim/Triggers] Unhandled error in triggers/feed:', error.message, error.stack);
        // Return graceful 503 with cached/empty data instead of 500
        return sendError(res, 503, "Trigger service temporarily unavailable. Please try again.");
    }
});

router.get('/admin/review-queue', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return sendError(res, 403, "Access denied. Admin privileges required.");
        }

        const claims = await Claim.find({ status: { $in: ['VERIFY', 'REJECTED', 'APPROVED'] } }).sort({ createdAt: -1 }).limit(20);
        return sendSuccess(res, { claims });
    } catch (error) {
        console.error("Claim review queue error:", error);
        return sendError(res, 500, "Could not load claim review queue");
    }
});

router.patch('/admin/:id/review', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return sendError(res, 403, "Access denied. Admin privileges required.");
        }

        const { status, note } = req.body || {};
        if (!['APPROVED', 'REJECTED', 'VERIFY'].includes(String(status || '').toUpperCase())) {
            return sendError(res, 400, "status must be APPROVED, REJECTED, or VERIFY");
        }

        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            return sendError(res, 404, "Claim not found");
        }

        claim.status = String(status).toUpperCase();
        claim.reviewedBy = String(req.user.id);
        claim.reviewedAt = new Date();
        claim.resolutionNote = String(note || '').trim();
        claim.payout = claim.status === 'APPROVED' ? (claim.claimAmount || claim.payout || 0) : 0;
        await claim.save();

        if (claim.status === 'APPROVED') {
            try {
                await payoutService.processPayout(claim);
            } catch (err) {
                console.error("Payout processing error during manual review:", err);
            }
        }

        return sendSuccess(res, { message: "Claim review updated", claim });
    } catch (error) {
        console.error("Claim review update error:", error);
        return sendError(res, 500, "Could not update claim review");
    }
});

module.exports = router;
