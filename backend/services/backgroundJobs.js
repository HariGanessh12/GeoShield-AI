const cron = require('node-cron');
const mongoose = require('mongoose');
const Policy = require('../models/policy');
const Claim = require('../models/claim');
const { getExternalData } = require('./externalDataService');
const { scoreClaim } = require('./trustScore');
const { processPayout } = require('./payoutService');

// Automated claim trigger job - runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('Running automated claim trigger job...');

    try {
        // Find active policies with shift ON
        const activePolicies = await Policy.find({
            status: 'ACTIVE',
            shiftState: 'ON',
            expiresAt: { $gt: new Date() }
        }).populate('workerId');

        for (const policy of activePolicies) {
            try {
                // Check for eligible disruption events
                const eligibleEvents = await checkForDisruptions(policy);

                for (const event of eligibleEvents) {
                    // Check if claim already exists for this event in last 2 hours
                    const existingClaim = await Claim.findOne({
                        workerId: policy.workerId._id,
                        policyId: policy._id,
                        trigger: event.eventType,
                        createdAt: { $gt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
                    });

                    if (!existingClaim) {
                        // Auto-trigger claim
                        await autoTriggerClaim(policy, event);
                    }
                }
            } catch (error) {
                console.error(`Error processing policy ${policy._id}:`, error);
            }
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

async function checkForDisruptions(policy) {
    const eligibleEvents = [];
    const worker = policy.workerId;

    for (const eventType of policy.coveredEvents) {
        try {
            const externalData = await getExternalData(eventType, worker.zone);

            // Check if severity meets threshold
            if (externalData.severityScore >= 0.5) {
                eligibleEvents.push({
                    eventType,
                    severityScore: externalData.severityScore,
                    baseProbability: externalData.baseProbability,
                    externalData
                });
            }
        } catch (error) {
            console.error(`Error checking ${eventType} for policy ${policy._id}:`, error);
        }
    }

    return eligibleEvents;
}

async function autoTriggerClaim(policy, event) {
    const worker = policy.workerId;

    // Create claim
    const claim = new Claim({
        workerId: worker._id,
        policyId: policy._id,
        trigger: event.eventType,
        amount: Math.min(policy.maxPayoutPerEvent, policy.coverageAmount * 0.1), // 10% of coverage
        status: 'PENDING',
        automated: true,
        location: {
            zone: worker.zone,
            // In production, would get real GPS from worker device
            coordinates: { lat: 0, lng: 0 }
        },
        externalData: event.externalData
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