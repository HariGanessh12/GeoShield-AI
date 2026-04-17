const cron = require('node-cron');
const Policy = require('../models/policy');
const Claim = require('../models/claim');
const User = require('../models/user');
const SystemStatus = require('../models/systemStatus');
const JobLease = require('../models/jobLease');
const { getExternalData } = require('./externalDataService');
const { processPayout, retryPayout } = require('./payoutService');
const config = require('../config');
const { logInfo, logWarn, logError } = require('../utils/logger');
const { scoreClaim } = require('./trustScore');

const SCAN_INTERVAL_MINUTES = 15;
const LEASE_MS = 10 * 60 * 1000;
let started = false;

async function acquireLease(jobName) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + LEASE_MS);
    const lease = await JobLease.findOneAndUpdate(
        {
            jobName,
            $or: [
                { lockedUntil: { $lte: now } },
                { ownerId: config.workerInstanceId }
            ]
        },
        {
            $set: {
                ownerId: config.workerInstanceId,
                lockedUntil,
                lastRunAt: now
            }
        },
        { upsert: true, new: true }
    );

    return lease?.ownerId === config.workerInstanceId;
}

async function releaseLease(jobName) {
    await JobLease.updateOne(
        { jobName, ownerId: config.workerInstanceId },
        { $set: { lockedUntil: new Date() } }
    );
}

async function withLease(jobName, handler) {
    const acquired = await acquireLease(jobName);
    if (!acquired) {
        logWarn('jobs.lease_skipped', { jobName, workerInstanceId: config.workerInstanceId });
        return;
    }

    try {
        await handler();
    } finally {
        await releaseLease(jobName);
    }
}

async function upsertSystemStatus(data) {
    return SystemStatus.findOneAndUpdate(
        { name: 'automatedTriggerMonitor' },
        { $set: data },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

function getNextScanTime(from = new Date()) {
    return new Date(from.getTime() + SCAN_INTERVAL_MINUTES * 60 * 1000);
}

async function checkForDisruptions(policy, zone) {
    const eligibleEvents = [];

    for (const eventType of policy.coveredEvents || []) {
        const externalData = await getExternalData(eventType, zone);
        if ((externalData?.severityScore || 0) >= 0.5) {
            eligibleEvents.push({
                eventType,
                severityScore: externalData.severityScore,
                externalData,
                reason: `Automated trigger detected for ${eventType} in ${zone}`
            });
        }
    }

    return eligibleEvents;
}

async function autoTriggerClaim(policy, worker, event) {
    const duplicateWindow = new Date(Date.now() - 60 * 60 * 1000);
    const existingClaim = await Claim.findOne({
        workerId: policy.workerId,
        policyId: policy._id,
        trigger: event.eventType,
        automated: true,
        createdAt: { $gte: duplicateWindow }
    });

    if (existingClaim) {
        return existingClaim;
    }

    const requestedAmount = Math.min(Number(policy.maxPayoutPerEvent || 0), Number(policy.coverageAmount || 0), 750);
    const claim = new Claim({
        workerId: policy.workerId,
        policyId: policy._id,
        trigger: event.eventType,
        amount: requestedAmount,
        status: 'PENDING',
        automated: true,
        source: 'worker_auto_scan',
        location: { zone: worker.zone || 'Delhi NCR' },
        externalData: event.externalData,
        reasons: [event.reason]
    });

    const workerClaims = await Claim.find({ workerId: policy.workerId }).sort({ createdAt: -1 }).limit(10).lean();
    const scoringResult = await scoreClaim(claim, {
        reputation: worker.reputationScore || 85,
        zone: worker.zone,
        claims_history: workerClaims.map((item) => ({ amount: item.amount, status: item.status })),
        recentClaims: workerClaims,
        recentClaimTimestamps: workerClaims.map((item) => item.createdAt)
    });

    claim.trustScore = scoringResult.trustScore;
    claim.adjustments = scoringResult.adjustments;
    claim.reasons = scoringResult.reasons;
    claim.status = scoringResult.status;
    claim.payout = scoringResult.status === 'APPROVED' ? requestedAmount : 0;
    await claim.save();

    if (claim.status === 'APPROVED') {
        try {
            await processPayout(claim);
        } catch (error) {
            claim.status = 'VERIFY';
            claim.payout = 0;
            claim.resolutionNote = `Worker auto payout failed: ${error.message}`;
            await claim.save();
        }
    }

    logInfo('jobs.auto_claim_processed', { claimId: String(claim._id), workerId: policy.workerId, status: claim.status });
    return claim;
}

async function automatedClaimTriggerJob() {
    const now = new Date();
    await upsertSystemStatus({
        lastScanAt: now,
        nextScanAt: getNextScanTime(now),
        scanIntervalMinutes: SCAN_INTERVAL_MINUTES
    });

    const activePolicies = await Policy.find({
        status: 'active',
        shiftState: 'ON',
        endDate: { $gt: now }
    }).lean();

    const triggersDetected = [];
    let lastAutoClaimCreated = null;
    for (const policy of activePolicies) {
        const worker = await User.findById(policy.workerId).lean();
        if (!worker) continue;
        const disruptions = await checkForDisruptions(policy, worker.zone || 'Delhi NCR');
        for (const event of disruptions) {
            const claim = await autoTriggerClaim(policy, worker, event);
            const triggerRecord = {
                policyId: String(policy._id),
                workerId: String(policy.workerId),
                trigger: event.eventType,
                severityScore: event.severityScore,
                claimId: claim?._id ? String(claim._id) : null,
                status: claim?.status || 'UNKNOWN',
                source: event.externalData?.source || 'Unknown',
                reliability: event.externalData?.reliability || 'fallback',
                detectedAt: new Date()
            };
            triggersDetected.push(triggerRecord);

            if (claim?._id) {
                lastAutoClaimCreated = {
                    claimId: String(claim._id),
                    trigger: claim.trigger,
                    status: claim.status,
                    createdAt: claim.createdAt,
                    processedAt: new Date(),
                    payoutStatus: claim.payoutStatus || 'PENDING'
                };
            }
        }
    }

    await upsertSystemStatus({
        lastTriggerDetected: triggersDetected[0] || null,
        lastAutoClaimCreated,
        triggersDetected
    });
}

async function claimsAgingJob() {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pendingClaims = await Claim.find({
        status: 'VERIFY',
        createdAt: { $lt: twoHoursAgo }
    }).lean();

    for (const claim of pendingClaims) {
        logWarn('jobs.claim_pending_review', { claimId: String(claim._id), workerId: String(claim.workerId) });
    }
}

async function payoutReconciliationJob() {
    const failedPayouts = await Claim.find({
        payoutStatus: 'FAILED',
        retryCount: { $lt: 3 },
        createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).lean();

    for (const claim of failedPayouts) {
        try {
            await retryPayout(claim._id);
        } catch (error) {
            logError('jobs.payout_retry_failed', error, { claimId: String(claim._id) });
        }
    }
}

function schedule(jobName, cronPattern, handler) {
    cron.schedule(cronPattern, async () => {
        try {
            await withLease(jobName, handler);
        } catch (error) {
            logError('jobs.execution_failed', error, { jobName });
        }
    });
}

function startBackgroundJobs() {
    if (started) return;
    started = true;

    schedule('automated-claim-trigger', '*/15 * * * *', automatedClaimTriggerJob);
    schedule('claims-aging', '0 * * * *', claimsAgingJob);
    schedule('payout-reconciliation', '0 6 * * *', payoutReconciliationJob);
    logInfo('jobs.scheduler_ready', { workerInstanceId: config.workerInstanceId });
}

module.exports = {
    startBackgroundJobs,
    checkForDisruptions,
    autoTriggerClaim
};
