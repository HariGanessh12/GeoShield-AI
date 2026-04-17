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

const INSURANCE_RULES = {
    waitingPeriodHours: 24,
    maxClaimsPerWeek: 1,
    excludedConditions: ['OUTSIDE_COVERAGE_HOURS', 'INACTIVE_POLICY', 'REPEATED_CLAIMS']
};

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

async function syncPolicyClaimTotals(policyId) {
    if (!policyId) return;

    const policy = await Policy.findById(policyId);
    if (!policy) return;

    const approvedSummary = await Claim.aggregate([
        {
            $match: {
                policyId: mongoose.Types.ObjectId.isValid(String(policyId))
                    ? new mongoose.Types.ObjectId(String(policyId))
                    : policyId,
                status: 'APPROVED'
            }
        },
        {
            $group: {
                _id: null,
                totalClaimsPaid: { $sum: { $ifNull: ['$payout', 0] } }
            }
        }
    ]);

    const totalClaimsPaid = Number(approvedSummary[0]?.totalClaimsPaid || 0);
    policy.totalClaimsPaid = totalClaimsPaid;
    policy.totalPremiumCollected = Number(policy.totalPremiumCollected || policy.premiumPaid || 0);
    policy.lossRatio = policy.totalPremiumCollected > 0
        ? totalClaimsPaid / policy.totalPremiumCollected
        : 0;

    await policy.save();
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
        .select('amount payout')
        .lean()
        .catch((err) => {
            console.warn("Claim history lookup failed, continuing without history:", err.message);
            return [];
        });

    const claimsHistory = recentClaims
        .map((claim) => Number.isFinite(Number(claim.amount)) ? Number(claim.amount) : Number(claim.payout))
        .filter((amount) => Number.isFinite(amount) && amount > 0);

    const policyId = activePolicy && activePolicy._id ? activePolicy._id : null;
    if (!policyId) {
        return {
            message: "No active policy found for worker.",
            decision: { status: 'REJECTED', payout: 0, reasons: ['No active policy found for worker'] }
        };
    }

    // Check waiting period
    const policyActivationTime = new Date(activePolicy.createdAt || activePolicy.startDate);
    const hoursSinceActivation = (Date.now() - policyActivationTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceActivation < INSURANCE_RULES.waitingPeriodHours) {
        return {
            message: "Claim rejected: Policy waiting period not met.",
            decision: { status: 'REJECTED', payout: 0, reasons: [`Policy waiting period of ${INSURANCE_RULES.waitingPeriodHours} hours not met`] }
        };
    }

    // Check if outside coverage hours (assuming worker must be on shift)
    const currentPolicy = await Policy.findOne({ workerId, status: 'ACTIVE' }).lean().catch(() => null);
    if (!currentPolicy || currentPolicy.shiftState !== 'ON') {
        return {
            message: "Claim rejected: Outside coverage hours.",
            decision: { status: 'REJECTED', payout: 0, reasons: ['Claim submitted outside active coverage hours'] }
        };
    }

    // Check inactive policy
    if (activePolicy.status !== 'ACTIVE') {
        return {
            message: "Claim rejected: Policy is inactive.",
            decision: { status: 'REJECTED', payout: 0, reasons: ['Policy is not active'] }
        };
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyClaimCount = await Claim.countDocuments({
        workerId,
        createdAt: { $gte: oneWeekAgo }
    }).catch((err) => {
        console.warn("Weekly claim count lookup failed:", err.message);
        return 0;
    });

    if (weeklyClaimCount >= INSURANCE_RULES.maxClaimsPerWeek) {
        const decision = {
            status: 'REJECTED',
            payout: 0,
            reasons: [`Weekly claim limit exceeded (max ${INSURANCE_RULES.maxClaimsPerWeek} claim per 7 days)`]
        };

        await Claim.create({
            workerId,
            policyId,
            trigger: disruptionFactor.type,
            amount: disruptionFactor.lossAmount || 0,
            trustScore: 0,
            status: decision.status,
            payout: decision.payout,
            reputationScore: userRecord.reputationScore || 85,
            reasons: decision.reasons,
            source,
            triggerSnapshot,
            externalData: { severityScore: disruptionFactor.severity }
        });

        return { message: "Claim rejected due to weekly limit.", decision };
    }

    if (!activePolicy.coveredEvents.includes(disruptionFactor.type)) {
        return {
            message: "Event not covered by active policy.",
            decision: { status: 'REJECTED', payout: 0, reasons: ["Event not covered"] }
        };
    }

    if (disruptionFactor.isInactiveWorker && activePolicy.exclusions.includes('INACTIVE_WORKER')) {
        return {
            message: "Claim rejected: Exclusion INACTIVE_WORKER matched.",
            decision: { status: 'REJECTED', payout: 0, reasons: ["Worker was inactive"] }
        };
    }

    const externalData = await externalDataService.getExternalData(disruptionFactor.type, userRecord.zone);
    disruptionFactor.severity = externalData.severityScore;

    const severityThreshold = 0.7;
    if (disruptionFactor.severity < severityThreshold) {
        const decision = {
            status: "REJECTED",
            trust_score: 100,
            payout: 0,
            reasons: ["Disruption severity below threshold (70%)"]
        };

        await Claim.create({
            workerId,
            policyId,
            trigger: disruptionFactor.type,
            amount: disruptionFactor.lossAmount || 0,
            trustScore: decision.trust_score,
            status: decision.status,
            payout: decision.payout,
            reputationScore: userRecord.reputationScore || 85,
            reasons: decision.reasons,
            source,
            triggerSnapshot,
            externalData
        });

        return { message: "Disruption severity too low.", decision };
    }

    const weeklyPremium = Number(activePolicy.premiumPaid) || 0;
    const payoutMultiplier = Number(activePolicy.payoutMultiplier) || 3;
    const limitByPremium = weeklyPremium > 0 ? weeklyPremium * payoutMultiplier : Infinity;
    const maxAllowedPayout = Math.min(
        Number.isFinite(Number(activePolicy.maxPayoutPerEvent)) ? activePolicy.maxPayoutPerEvent : Infinity,
        limitByPremium
    );

    const requestedAmount = Number(disruptionFactor.lossAmount) || 0;
    if (requestedAmount <= 0) {
        const decision = {
            status: 'REJECTED',
            payout: 0,
            reasons: ['Invalid requested payout amount']
        };

        await Claim.create({
            workerId,
            policyId,
            trigger: disruptionFactor.type,
            amount: requestedAmount,
            trustScore: 0,
            status: decision.status,
            payout: decision.payout,
            reputationScore: userRecord.reputationScore || 85,
            reasons: decision.reasons,
            source,
            triggerSnapshot,
            externalData
        });

        return { message: 'Invalid claim amount.', decision };
    }

    if (requestedAmount > maxAllowedPayout) {
        const decision = {
            status: 'REJECTED',
            payout: 0,
            reasons: [`Requested payout exceeds policy event cap of ₹${maxAllowedPayout.toFixed(2)}`]
        };

        await Claim.create({
            workerId,
            policyId,
            trigger: disruptionFactor.type,
            amount: requestedAmount,
            trustScore: 0,
            status: decision.status,
            payout: decision.payout,
            reputationScore: userRecord.reputationScore || 85,
            reasons: decision.reasons,
            source,
            triggerSnapshot,
            externalData
        });

        return { message: 'Claim rejected because payout exceeds allowed limit.', decision };
    }

    const profile = { reputation: userRecord.reputationScore || 85, claims_history: claimsHistory };
    const claimRecord = new Claim({
        workerId,
        policyId,
        trigger: disruptionFactor.type,
        amount: requestedAmount,
        location: userRecord.location || { zone: userRecord.zone },
        deviceInfo: {},
        externalData,
        source,
        triggerSnapshot
    });

    const scoringResult = await trustScoreService.scoreClaim(claimRecord, profile);

    const claimDecision = {
        ...scoringResult,
        payout: scoringResult.status === 'APPROVED' ? requestedAmount : 0
    };

    claimRecord.trustScore = scoringResult.trustScore;
    claimRecord.adjustments = scoringResult.adjustments;
    claimRecord.reasons = scoringResult.reasons || [];
    claimRecord.status = scoringResult.status;
    claimRecord.payout = claimDecision.payout;
    claimRecord.reputationScore = profile.reputation;

    if (scoringResult.status === 'APPROVED') {
        try {
            await payoutService.processPayout(claimRecord);
        } catch (err) {
            console.error("Payout processing error:", err);
            claimRecord.status = 'VERIFY';
            claimRecord.resolutionNote = `Auto-approved but payout failed: ${err.message}`;
            claimDecision.status = 'VERIFY';
        }
    }

    await claimRecord.save();

    if (claimRecord.status === 'APPROVED') {
        try {
            const policyDoc = await Policy.findById(policyId);
            if (policyDoc) {
                policyDoc.totalClaimsPaid = (policyDoc.totalClaimsPaid || 0) + claimRecord.payout;
                policyDoc.totalPremiumCollected = Number(policyDoc.totalPremiumCollected || policyDoc.premiumPaid || 0);
                policyDoc.lossRatio = policyDoc.totalPremiumCollected > 0
                    ? policyDoc.totalClaimsPaid / policyDoc.totalPremiumCollected
                    : 0;
                await policyDoc.save();
            }
        } catch (err) {
            console.warn("Policy loss ratio update failed:", err.message);
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
            .select('amount payout')
            .lean()
            .catch((err) => {
                console.warn("Claim history lookup failed, continuing without history:", err.message);
                return [];
            });

        const claimsHistory = recentClaims
            .map((claim) => Number.isFinite(Number(claim.amount)) ? Number(claim.amount) : Number(claim.payout))
            .filter((amount) => Number.isFinite(amount) && amount > 0);

        // 🛡️ INSURANCE ELIGIBILITY CHECK
        const activePolicy = normalizePolicy(await Policy.findOne({ workerId, status: 'active' }).lean().catch((err) => {
            console.warn("Policy lookup failed, using fallback policy:", err.message);
            return null;
        }));

        if (!activePolicy || !activePolicy._id) {
            return sendSuccess(res, {
                message: "No active policy found for worker.",
                decision: { status: 'REJECTED', reasons: ['No active policy found'] }
            });
        }

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

        const claims = await Claim.find({ status: 'VERIFY' })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return sendSuccess(res, {
            claims: claims.map((claim) => ({
                ...claim,
                claimAmount: Number(claim.amount || 0)
            }))
        });
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

        if (claim.status !== 'VERIFY') {
            return sendError(res, 409, "Claim is no longer pending review.");
        }

        claim.status = String(status).toUpperCase();
        claim.reviewedBy = String(req.user.id);
        claim.reviewedAt = new Date();
        claim.resolutionNote = String(note || '').trim();

        if (claim.status === 'APPROVED') {
            claim.payout = Number(claim.amount || claim.payout || 0);
            claim.payoutStatus = 'PENDING';
            await claim.save();

            try {
                await payoutService.processPayout(claim);
            } catch (err) {
                console.error("Payout processing error during manual review:", err);
                claim.status = 'VERIFY';
                claim.resolutionNote = `Manual approval attempted but payout failed: ${err.message}`;
                await claim.save();
                return sendError(res, 500, "Claim payout failed during approval. Review remains pending.");
            }
        } else {
            claim.payout = 0;
            claim.payoutStatus = 'NOT_APPLICABLE';
            await claim.save();
        }

        await syncPolicyClaimTotals(claim.policyId);

        return sendSuccess(res, { message: "Claim review updated", claim });
    } catch (error) {
        console.error("Claim review update error:", error);
        return sendError(res, 500, "Could not update claim review");
    }
});

module.exports = router;
