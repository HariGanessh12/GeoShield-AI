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

    await Claim.create({
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
        const { disruptionFactor } = req.body;

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
                trigger: disruptionFactor.type,
                claimAmount: disruptionFactor.lossAmount || 0,
                trustScore: decision.trust_score,
                status: decision.status,
                payout: decision.payout,
                reputationScore: profile.reputation,
                reasons: decision.reasons
            });

            return sendSuccess(res, { message: "Disruption severity too low.", decision });
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
                claimAmount: disruptionFactor.lossAmount || 0,
                trustScore: claimDecision.trust_score,
                status: claimDecision.status,
                payout: payoutAmount,
                reputationScore: profile.reputation,
                reasons: claimDecision.reasons
            });
        } catch (persistError) {
            console.warn("Claim persistence failed, returning evaluation anyway:", persistError.message);
        }
        
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

        const policy = normalizePolicy(await Policy.findOne({ workerId, status: 'active' }).lean());
        const shiftState = policy.shiftState || 'OFF';
        const feed = evaluateTriggerEligibility(await buildTriggerFeed(user.zone), policy, shiftState);
        const recommendedTrigger = selectRecommendedTrigger(feed);

        if (!recommendedTrigger) {
            return sendSuccess(res, {
                message: shiftState !== 'ON'
                    ? "No zero-touch claim created because shift coverage is OFF."
                    : "No eligible trigger crossed the auto-claim threshold.",
                automated: false,
                triggers: feed
            });
        }

        const result = await processClaimForWorker({
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

        return sendSuccess(res, {
            ...result,
            automated: true,
            recommendedTrigger,
            triggers: feed
        });
    } catch (error) {
        console.error("Zero-touch scan error:", error);
        return sendError(res, 500, "Could not complete zero-touch scan");
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

        const policy = normalizePolicy(await Policy.findOne({ workerId, status: 'active' }).lean());
        const shiftState = policy.shiftState || 'OFF';
        const feed = evaluateTriggerEligibility(await buildTriggerFeed(user.zone), policy, shiftState);

        return sendSuccess(res, {
            workerId,
            zone: user.zone,
            shiftState,
            triggers: feed
        });
    } catch (error) {
        console.error("Trigger feed error:", error);
        return sendError(res, 500, "Could not load trigger feed");
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

        return sendSuccess(res, { message: "Claim review updated", claim });
    } catch (error) {
        console.error("Claim review update error:", error);
        return sendError(res, 500, "Could not update claim review");
    }
});

module.exports = router;
