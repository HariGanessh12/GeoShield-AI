const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const trustScoreService = require('../services/trustScore');
const externalDataService = require('../services/externalDataService');
const Claim = require('../models/claim');
const Policy = require('../models/policy');
const User = require('../models/user');
const { sendSuccess, sendError } = require('../utils/http');
const { buildTriggerFeed, evaluateTriggerEligibility, selectRecommendedTrigger } = require('../services/triggerEngine');
const payoutService = require('../services/payoutService');
const { logInfo, logWarn, logError } = require('../utils/logger');
const POLICY_RULES = require('../config/policyRules');

const router = express.Router();

function getWorkerId(req) {
    const candidate = req.user && (req.user.id || req.user._id || req.user.userId);
    if (!candidate) return null;
    const workerId = String(candidate);
    return mongoose.Types.ObjectId.isValid(workerId) ? workerId : null;
}

function normalizePolicy(policy) {
    const source = policy || {};
    return {
        ...source,
        status: String(source.status || 'active').toLowerCase(),
        coveredEvents: Array.isArray(source.coveredEvents) && source.coveredEvents.length > 0
            ? source.coveredEvents
            : ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE', 'AQI_SEVERE', 'TRAFFIC_SURGE'],
        exclusions: Array.isArray(source.exclusions) && source.exclusions.length > 0
            ? source.exclusions
            : ['INACTIVE_WORKER', 'GPS_MISMATCH', 'ALREADY_COMPENSATED']
    };
}

function generateIdempotencyKey({ workerId, policyId, trigger, source, createdBucket }) {
    return crypto
        .createHash('sha256')
        .update([workerId, policyId, trigger, source, createdBucket].join(':'))
        .digest('hex');
}

async function syncPolicyClaimTotals(policyId) {
    if (!policyId) return;
    const policy = await Policy.findById(policyId);
    if (!policy) return;

    const approvedSummary = await Claim.aggregate([
        { $match: { policyId: policy._id, status: 'APPROVED' } },
        {
            $group: {
                _id: null,
                totalClaimsPaid: { $sum: { $ifNull: ['$payout', 0] } }
            }
        }
    ]);

    policy.totalClaimsPaid = Number(approvedSummary[0]?.totalClaimsPaid || 0);
    policy.totalPremiumCollected = Number(policy.totalPremiumCollected || policy.premiumPaid || 0);
    policy.lossRatio = policy.totalPremiumCollected > 0
        ? policy.totalClaimsPaid / policy.totalPremiumCollected
        : 0;
    await policy.save();
}

async function fetchUserContext(workerId) {
    const user = await User.findById(workerId).lean();
    if (!user) {
        throw new Error('Worker not found');
    }

    const activePolicy = normalizePolicy(await Policy.findOne({ workerId, status: 'active' }).sort({ createdAt: -1 }).lean());
    const recentClaims = await Claim.find({ workerId }).sort({ createdAt: -1 }).limit(10).lean();

    return { user, activePolicy, recentClaims };
}

function validateClaimInput(disruptionFactor) {
    if (!disruptionFactor || typeof disruptionFactor !== 'object') return 'disruptionFactor is required';
    if (!disruptionFactor.type || typeof disruptionFactor.type !== 'string') return 'disruptionFactor.type is required';
    const amount = Number(disruptionFactor.lossAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 'disruptionFactor.lossAmount must be a positive number';
    return null;
}

async function processClaimForWorker({
    workerId,
    disruptionFactor,
    location,
    deviceInfo,
    source = 'manual_trigger',
    triggerSnapshot = null
}) {
    const { user, activePolicy, recentClaims } = await fetchUserContext(workerId);

    if (!activePolicy?._id || activePolicy.status !== 'active') {
        return {
            message: 'No active policy found for worker.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 0, reasons: ['No active policy found for worker'] }
        };
    }

    const policyActivationTime = new Date(activePolicy.createdAt || activePolicy.startDate);
    const hoursSinceActivation = (Date.now() - policyActivationTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceActivation < POLICY_RULES.waiting_period_hours) {
        return {
            message: 'Claim rejected: policy waiting period not met.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 0, reasons: [`Rejected: waiting period of ${POLICY_RULES.waiting_period_hours} hours not met`] }
        };
    }

    if (activePolicy.shiftState !== 'ON') {
        return {
            message: 'Claim rejected: shift coverage is OFF.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 0, reasons: ['Rejected: outside coverage hours'] }
        };
    }

    if (!activePolicy.coveredEvents.includes(disruptionFactor.type)) {
        return {
            message: 'Event not covered by active policy.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 0, reasons: ['Rejected: event not covered by policy'] }
        };
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyClaimCount = await Claim.countDocuments({
        workerId,
        createdAt: { $gte: oneWeekAgo }
    });

    if (weeklyClaimCount >= POLICY_RULES.max_claims_per_week) {
        return {
            message: 'Claim rejected due to weekly limit.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 0, reasons: [`Rejected: max ${POLICY_RULES.max_claims_per_week} claim allowed per week`] }
        };
    }

    const externalData = await externalDataService.getExternalData(disruptionFactor.type, user.zone);
    const severityScore = Number(externalData?.severityScore || 0);

    if (severityScore < POLICY_RULES.min_severity_for_approval && disruptionFactor.type !== 'PLATFORM_OUTAGE') {
        return {
            message: 'Disruption severity too low.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 100, reasons: ['Rejected: disruption severity below minimum threshold'] }
        };
    }

    const requestedAmount = Number(disruptionFactor.lossAmount || 0);
    const payoutCap = Math.min(
        Number(activePolicy.maxPayoutPerEvent || requestedAmount),
        Number(activePolicy.coverageAmount || requestedAmount)
    );

    if (requestedAmount > payoutCap) {
        return {
            message: 'Claim rejected because payout exceeds allowed limit.',
            decision: { status: 'REJECTED', payout: 0, trustScore: 0, reasons: [`Rejected: requested payout exceeds policy event cap of ₹${payoutCap.toFixed(2)}`] }
        };
    }

    const createdBucket = new Date().toISOString().slice(0, 13);
    const idempotencyKey = generateIdempotencyKey({
        workerId,
        policyId: String(activePolicy._id),
        trigger: disruptionFactor.type,
        source,
        createdBucket
    });

    const existingClaim = await Claim.findOne({ idempotencyKey }).lean();
    if (existingClaim) {
        return {
            message: 'Duplicate claim prevented by idempotency guard.',
            decision: {
                status: existingClaim.status,
                payout: Number(existingClaim.payout || 0),
                trustScore: Number(existingClaim.trustScore || 0),
                reasons: existingClaim.reasons || ['Duplicate claim request ignored']
            }
        };
    }

    const claimRecord = new Claim({
        workerId,
        policyId: activePolicy._id,
        idempotencyKey,
        trigger: disruptionFactor.type,
        amount: requestedAmount,
        location: location || { zone: user.zone },
        deviceInfo: deviceInfo || {},
        externalData,
        source,
        triggerSnapshot,
        automated: source !== 'manual_trigger'
    });

    const scoringResult = await trustScoreService.scoreClaim(claimRecord, {
        reputation: user.reputationScore || 85,
        zone: user.zone,
        claims_history: recentClaims.map((claim) => ({ amount: Number(claim.amount || 0), status: claim.status })),
        recentClaims,
        recentClaimTimestamps: recentClaims.map((claim) => claim.createdAt)
    });

    const claimDecision = {
        status: scoringResult.status,
        payout: scoringResult.status === 'APPROVED' ? requestedAmount : 0,
        trustScore: Number(scoringResult.trustScore || scoringResult.trust_score || 0),
        trust_score: Number(scoringResult.trustScore || scoringResult.trust_score || 0),
        reasons: scoringResult.reasons || [],
        adjustments: scoringResult.adjustments || [],
        aiConfidence: scoringResult.aiConfidence,
        source: scoringResult.source
    };

    claimRecord.trustScore = claimDecision.trustScore;
    claimRecord.adjustments = claimDecision.adjustments;
    claimRecord.reasons = claimDecision.reasons;
    claimRecord.status = claimDecision.status;
    claimRecord.payout = claimDecision.payout;
    claimRecord.reputationScore = user.reputationScore || 85;

    await claimRecord.save();

    if (claimRecord.status === 'APPROVED') {
        try {
            await payoutService.processPayout(claimRecord);
        } catch (error) {
            claimRecord.status = 'VERIFY';
            claimRecord.payout = 0;
            claimRecord.resolutionNote = `Auto-approved but payout failed: ${error.message}`;
            await claimRecord.save();
            claimDecision.status = 'VERIFY';
            claimDecision.payout = 0;
            claimDecision.reasons = [...claimDecision.reasons, 'Payout failed and claim moved to manual review'];
        }
    } else if (claimRecord.status === 'REJECTED') {
        claimRecord.payoutStatus = 'NOT_APPLICABLE';
        await claimRecord.save();
    }

    await syncPolicyClaimTotals(activePolicy._id);

    logInfo('claim.processed', {
        claimId: String(claimRecord._id),
        workerId,
        policyId: String(activePolicy._id),
        event: disruptionFactor.type,
        source,
        status: claimDecision.status
    });

    return {
        message: 'Claim processing completed',
        decision: claimDecision,
        claimId: String(claimRecord._id)
    };
}

router.get('/history', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) return sendError(res, 401, 'Unauthorized');
        const claims = await Claim.find({ workerId }).sort({ createdAt: -1 }).limit(10).lean();
        return sendSuccess(res, claims);
    } catch (error) {
        logError('claim.history_failed', error, { workerId: req.user?.id });
        return sendError(res, 500, 'Could not fetch claims');
    }
});

router.post('/auto-trigger', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) return sendError(res, 401, 'Invalid or missing authentication.');

        const validationError = validateClaimInput(req.body?.disruptionFactor);
        if (validationError) return sendError(res, 400, validationError);

        const result = await processClaimForWorker({
            workerId,
            disruptionFactor: req.body.disruptionFactor,
            location: req.body.location,
            deviceInfo: req.body.deviceInfo,
            source: 'manual_trigger'
        });

        return sendSuccess(res, result);
    } catch (error) {
        logError('claim.auto_trigger_failed', error, { workerId: req.user?.id });
        return sendError(res, 500, 'Internal server error during claim generation.');
    }
});

router.post('/zero-touch-scan', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) return sendError(res, 401, 'Invalid or missing authentication.');

        const { user, activePolicy } = await fetchUserContext(workerId);
        const feed = evaluateTriggerEligibility(await buildTriggerFeed(user.zone), activePolicy, activePolicy?.shiftState || 'OFF');
        const recommendedTrigger = selectRecommendedTrigger(feed);

        if (!recommendedTrigger) {
            return sendSuccess(res, {
                message: activePolicy?.shiftState !== 'ON'
                    ? 'No zero-touch claim created because shift coverage is OFF.'
                    : 'No eligible trigger crossed the auto-claim threshold.',
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
            location: { zone: user.zone },
            deviceInfo: {},
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
        logError('claim.zero_touch_failed', error, { workerId: req.user?.id });
        return sendError(res, 503, 'Zero-touch scan service temporarily unavailable. Please try again.');
    }
});

router.get('/triggers/feed', async (req, res) => {
    try {
        const workerId = getWorkerId(req);
        if (!workerId) return sendError(res, 401, 'Invalid or missing authentication.');

        const { user, activePolicy } = await fetchUserContext(workerId);
        const feed = evaluateTriggerEligibility(await buildTriggerFeed(user.zone), activePolicy, activePolicy?.shiftState || 'OFF');

        return sendSuccess(res, {
            workerId,
            zone: user.zone,
            shiftState: activePolicy?.shiftState || 'OFF',
            triggers: feed,
            _meta: {
                dataSource: feed.some((item) => item.severityScore > 0) ? 'live_or_fallback_external' : 'unavailable',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logError('claim.trigger_feed_failed', error, { workerId: req.user?.id });
        return sendError(res, 503, 'Trigger service temporarily unavailable. Please try again.');
    }
});

router.get('/admin/review-queue', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') return sendError(res, 403, 'Access denied. Admin privileges required.');

        const claims = await Claim.find({ status: 'VERIFY' }).sort({ createdAt: -1 }).limit(20).lean();
        return sendSuccess(res, {
            claims: claims.map((claim) => ({
                ...claim,
                claimAmount: Number(claim.amount || 0)
            }))
        });
    } catch (error) {
        logError('claim.review_queue_failed', error, { userId: req.user?.id });
        return sendError(res, 500, 'Could not load claim review queue');
    }
});

router.patch('/admin/:id/review', async (req, res) => {
    try {
        if (req.user?.role !== 'admin') return sendError(res, 403, 'Access denied. Admin privileges required.');

        const nextStatus = String(req.body?.status || '').toUpperCase();
        if (!['APPROVED', 'REJECTED', 'VERIFY'].includes(nextStatus)) {
            return sendError(res, 400, 'status must be APPROVED, REJECTED, or VERIFY');
        }

        const claim = await Claim.findById(req.params.id);
        if (!claim) return sendError(res, 404, 'Claim not found');
        if (!['VERIFY', 'PENDING'].includes(claim.status)) {
            return sendError(res, 409, 'Claim is no longer pending review.');
        }

        claim.status = nextStatus;
        claim.reviewedBy = String(req.user.id);
        claim.reviewedAt = new Date();
        claim.resolutionNote = String(req.body?.note || '').trim();

        if (nextStatus === 'APPROVED') {
            claim.payout = Number(claim.amount || 0);
            claim.payoutStatus = 'PENDING';
            await claim.save();
            await payoutService.processPayout(claim);
        } else if (nextStatus === 'REJECTED') {
            claim.payout = 0;
            claim.payoutStatus = 'NOT_APPLICABLE';
            await claim.save();
        } else {
            await claim.save();
        }

        await syncPolicyClaimTotals(claim.policyId);
        logInfo('claim.reviewed', { claimId: String(claim._id), reviewedBy: String(req.user.id), status: nextStatus });
        return sendSuccess(res, { message: 'Claim review updated', claim });
    } catch (error) {
        logError('claim.review_failed', error, { userId: req.user?.id, claimId: req.params.id });
        return sendError(res, 500, 'Could not update claim review');
    }
});

module.exports = router;
