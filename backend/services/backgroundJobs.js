const cron = require('node-cron');
const mongoose = require('mongoose');
const Policy = require('../models/policy');
const Claim = require('../models/claim');
const User = require('../models/user');
const SystemStatus = require('../models/systemStatus');
const { getExternalData } = require('./externalDataService');
const { scoreClaim } = require('./trustScore');
const { processPayout } = require('./payoutService');

const SCAN_INTERVAL_MINUTES = 15;

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

// Automated claim trigger job - runs every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const nextScanAt = getNextScanTime(now);
    console.log('Running automated claim trigger job...', now.toISOString());

    await upsertSystemStatus({
        lastScanAt: now,
        nextScanAt,
        scanIntervalMinutes: SCAN_INTERVAL_MINUTES
    });

    try {
        // Find active policies with shift ON
        const activePolicies = await Policy.find({
            status: 'active',
            shiftState: 'ON',
            endDate: { $gt: new Date() }
        });

        const detectedTriggers = [];
        for (const policy of activePolicies) {
            try {
                const worker = await User.findById(policy.workerId).lean();
                if (!worker) {
                    console.warn(`Skipping policy ${policy._id} because worker ${policy.workerId} cannot be loaded.`);
                    continue;
                }

                const eligibleEvents = await checkForDisruptions(policy, worker.zone);

                for (const event of eligibleEvents) {
                    const duplicateWindow = 60 * 60 * 1000; // 1 hour
                    const existingClaim = await Claim.findOne({
                        workerId: policy.workerId,
                        policyId: policy._id,
                        trigger: event.eventType,
                        automated: true,
                        createdAt: { $gt: new Date(Date.now() - duplicateWindow) }
                    });

                    if (!existingClaim) {
                        const claim = await autoTriggerClaim(policy, worker, event);
                        detectedTriggers.push({
                            policyId: policy._id,
                            workerId: policy.workerId,
                            trigger: event.eventType,
                            severityScore: event.severityScore,
                            claimId: claim?._id || null,
                            status: claim?.status || 'FAILED',
                            detectedAt: new Date()
                        });
                    }
                }
            } catch (error) {
                console.error(`Error processing policy ${policy._id}:`, error);
            }
        }

        if (detectedTriggers.length > 0) {
            await upsertSystemStatus({
                lastTriggerDetected: detectedTriggers[detectedTriggers.length - 1],
                triggersDetected: detectedTriggers
            });
        }
    } catch (error) {
        console.error('Automated claim trigger job failed:', error);
    }
});

// Fraud ring detection job - runs daily at 2 AM
cron.schedule('0 2 * * *', async () => {
    console.log('Running fraud ring detection job...');

    try {
        // This would integrate with AI engine for batch fraud analysis
        // For now, log that it ran
        console.log('Fraud ring detection completed (placeholder)');
    } catch (error) {
        console.error('Fraud ring detection job failed:', error);
    }
});

// Claims aging and escalation job - runs hourly
cron.schedule('0 * * * *', async () => {
    console.log('Running claims aging job...');

    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const pendingClaims = await Claim.find({
            status: 'VERIFY',
            createdAt: { $lt: twoHoursAgo }
        });

        for (const claim of pendingClaims) {
            // Escalate to admin attention (could send email/notification)
            console.log(`Escalating claim ${claim._id} - pending too long`);
            // In production, send notification to admin
        }
    } catch (error) {
        console.error('Claims aging job failed:', error);
    }
});

// Payout reconciliation job - runs daily at 6 AM
cron.schedule('0 6 * * *', async () => {
    console.log('Running payout reconciliation job...');

    try {
        // Check for failed payouts and retry
        const failedPayouts = await Claim.find({
            payoutStatus: 'FAILED',
            createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });

        for (const claim of failedPayouts) {
            console.log(`Retrying payout for claim ${claim._id}`);
            // Retry logic would go here
        }
    } catch (error) {
        console.error('Payout reconciliation job failed:', error);
    }
});

async function checkForDisruptions(policy, zone) {
    const eligibleEvents = [];
    const workerZone = zone || 'Delhi NCR';

    for (const eventType of policy.coveredEvents || []) {
        try {
            const externalData = await getExternalData(eventType, workerZone);

            // Check if severity meets threshold
            if (externalData.severityScore >= 0.5) {
                eligibleEvents.push({
                    eventType,
                    severityScore: externalData.severityScore,
                    baseProbability: externalData.baseProbability,
                    externalData,
                    reason: `Automated trigger detected for ${eventType} in ${workerZone}`
                });
            }
        } catch (error) {
            console.error(`Error checking ${eventType} for policy ${policy._id}:`, error);
        }
    }

    return eligibleEvents;
}

async function autoTriggerClaim(policy, worker, event) {
    const requestedAmount = Math.min(policy.maxPayoutPerEvent, policy.coverageAmount * 0.1);

    const claim = new Claim({
        workerId: policy.workerId,
        policyId: policy._id,
        trigger: event.eventType,
        amount: requestedAmount,
        status: 'PENDING',
        automated: true,
        location: {
            zone: worker.zone || 'Delhi NCR',
            coordinates: {
                lat: worker.location?.coordinates?.lat || 0,
                lng: worker.location?.coordinates?.lng || 0
            }
        },
        externalData: event.externalData,
        reasons: [event.reason]
    });

    // Score the claim
    const scoringResult = await scoreClaim(claim, worker);

    claim.trustScore = scoringResult.trustScore;
    claim.adjustments = scoringResult.adjustments;
    claim.reasons = scoringResult.reasons;

    // Auto-decide based on trust score
    if (scoringResult.trustScore >= 80) {
        claim.status = 'APPROVED';
        // Process payout
        await processPayout(claim);
    } else if (scoringResult.trustScore >= 50) {
        claim.status = 'VERIFY'; // Admin review
    } else {
        claim.status = 'REJECTED';
    }

    await claim.save();

    console.log(`Auto-triggered claim ${claim._id} for worker ${worker._id}: ${claim.status}`);

    return claim;
}

module.exports = {
    // Export for testing
    checkForDisruptions,
    autoTriggerClaim
};