const crypto = require('crypto');
const config = require('../config');
const Claim = require('../models/claim');
const Payout = require('../models/payout');
const Policy = require('../models/policy');
const { logInfo, logError } = require('../utils/logger');

function buildReference(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function selectPaymentMethod(claim, preferredMethod) {
    if (preferredMethod && ['UPI', 'BANK'].includes(String(preferredMethod).toUpperCase())) {
        return String(preferredMethod).toUpperCase();
    }

    const amount = Number(claim?.payout || claim?.amount || 0);
    return amount <= 1000 ? 'UPI' : 'BANK';
}

function simulatePayoutOutcome({ amount, paymentMethod, retryCount = 0 }) {
    const normalizedAmount = Number(amount || 0);
    const baseFailureRate = paymentMethod === 'BANK' ? 0.06 : 0.03;
    const amountRisk = normalizedAmount > 2000 ? 0.03 : normalizedAmount > 1000 ? 0.015 : 0;
    const retryBonus = retryCount > 0 ? -0.01 : 0;
    const failureRate = Math.max(0.01, baseFailureRate + amountRisk + retryBonus);

    const checksum = normalizedAmount + paymentMethod.length + retryCount;
    const pseudoRandom = (checksum * 9301 + 49297) % 233280;
    const probability = pseudoRandom / 233280;
    const success = probability > failureRate;

    return {
        success,
        status: success ? 'SUCCESS' : 'FAILED',
        message: success
            ? `₹${normalizedAmount} credited via ${paymentMethod} (Simulated)`
            : `Simulated ${paymentMethod} transfer failed. Retry recommended.`,
        failureRate: Number(failureRate.toFixed(4))
    };
}

async function createOrUpdatePayoutRecord({ claim, userId, amount, preferredMethod }) {
    const paymentMethod = selectPaymentMethod(claim, preferredMethod);
    const existingRecord = claim.payoutRecordId ? await Payout.findById(claim.payoutRecordId) : await Payout.findOne({ claimId: claim._id });

    if (existingRecord && existingRecord.status === 'SUCCESS') {
        return existingRecord;
    }

    const outcome = simulatePayoutOutcome({
        amount,
        paymentMethod,
        retryCount: Number(claim.retryCount || 0)
    });

    const payload = {
        claimId: claim._id,
        userId: String(userId || claim.workerId),
        amount: Number(amount || 0),
        status: outcome.status,
        transactionId: existingRecord?.transactionId || buildReference('txn'),
        paymentMethod,
        provider: 'Simulated Payment (Razorpay-ready)',
        message: outcome.message,
        timestamp: new Date(),
        metadata: {
            failureRate: outcome.failureRate,
            payoutProvider: config.payoutProvider,
            mode: 'simulated'
        }
    };

    if (existingRecord) {
        Object.assign(existingRecord, payload);
        await existingRecord.save();
        return existingRecord;
    }

    return Payout.create(payload);
}

async function processPayout(claim, options = {}) {
    if (!claim || claim.status !== 'APPROVED') {
        throw new Error('Payout can only be processed for APPROVED claims.');
    }

    if (claim.payoutStatus === 'COMPLETED' && claim.transactionId) {
        return {
            transaction_id: claim.transactionId,
            status: 'success',
            message: claim.resolutionNote || 'Payout already completed',
            payment_method: claim.payoutMethod,
            timestamp: claim.payoutProcessedAt
        };
    }

    try {
        const payoutRecord = await createOrUpdatePayoutRecord({
            claim,
            userId: options.userId || claim.workerId,
            amount: options.amount || claim.payout || claim.amount,
            preferredMethod: options.paymentMethod
        });

        claim.transactionId = payoutRecord.transactionId;
        claim.providerReference = payoutRecord.transactionId;
        claim.payoutProvider = payoutRecord.provider;
        claim.payoutStatus = payoutRecord.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED';
        claim.payoutProcessedAt = payoutRecord.timestamp;
        claim.payoutMethod = payoutRecord.paymentMethod;
        claim.payoutRecordId = payoutRecord._id;
        claim.resolutionNote = payoutRecord.message;
        await claim.save();

        logInfo('payout.processed', {
            claimId: String(claim._id),
            workerId: String(claim.workerId),
            transactionId: payoutRecord.transactionId,
            status: payoutRecord.status,
            amount: payoutRecord.amount
        });

        return {
            transaction_id: payoutRecord.transactionId,
            status: payoutRecord.status === 'SUCCESS' ? 'success' : 'failed',
            message: payoutRecord.message,
            payment_method: payoutRecord.paymentMethod,
            timestamp: payoutRecord.timestamp
        };
    } catch (error) {
        claim.payoutStatus = 'FAILED';
        claim.resolutionNote = `Payout failed: ${error.message}`;
        await claim.save();
        logError('payout.failed', error, { claimId: String(claim._id), workerId: String(claim.workerId) });
        throw error;
    }
}

async function processPayoutByClaim({ claimId, userId, amount, paymentMethod }) {
    const claim = await Claim.findById(claimId);
    if (!claim) throw new Error('Claim not found');
    if (String(claim.workerId) !== String(userId) && String(userId) !== String(claim.reviewedBy || '') && userId) {
        // allow current worker or admin-triggered route to process matching claim
    }

    if (claim.status !== 'APPROVED') {
        throw new Error('Only approved claims can be paid out');
    }

    if (amount !== undefined) {
        claim.payout = Number(amount);
    }

    return processPayout(claim, { userId, amount, paymentMethod });
}

async function retryPayout(claimId) {
    const claim = await Claim.findById(claimId);
    if (!claim) throw new Error('Claim not found');
    if (!['FAILED', 'PENDING', 'COMPLETED'].includes(claim.payoutStatus)) {
        throw new Error('Claim is not eligible for payout retry');
    }
    if (claim.payoutStatus === 'COMPLETED') {
        return processPayout(claim);
    }

    claim.retryCount = Number(claim.retryCount || 0) + 1;
    claim.payoutStatus = 'PENDING';
    await claim.save();
    return processPayout(claim);
}

async function getPayoutAnalytics(timeframe = '30d') {
    const days = Number(String(timeframe).replace(/\D/g, '') || 30);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const payouts = await Payout.find({
        timestamp: { $gte: startDate },
        status: { $in: ['SUCCESS', 'FAILED'] }
    }).lean();

    const totalAmount = payouts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const successCount = payouts.filter((item) => item.status === 'SUCCESS').length;
    const failureCount = payouts.filter((item) => item.status === 'FAILED').length;

    return {
        totalPayouts: payouts.length,
        totalAmount,
        successCount,
        failureCount,
        successRate: payouts.length ? Math.round((successCount / payouts.length) * 10000) / 100 : 0,
        provider: 'Simulated Payment (Razorpay-ready)'
    };
}

async function getPayoutsForUser(userId) {
    return Payout.find({ userId: String(userId) }).sort({ timestamp: -1 }).limit(25).lean();
}

async function getPayoutSummary(userId) {
    const normalizedUserId = String(userId);
    const [payouts, approvedClaimsCount, activePolicy] = await Promise.all([
        Payout.find({ userId: normalizedUserId, status: 'SUCCESS' }).sort({ timestamp: -1 }).lean(),
        Claim.countDocuments({ workerId: normalizedUserId, status: 'APPROVED' }),
        Policy.findOne({ workerId: normalizedUserId }).sort({ createdAt: -1 }).lean()
    ]);

    const totalPayoutReceived = payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
    const lastPayout = payouts[0]
        ? {
            amount: Number(payouts[0].amount || 0),
            transaction_id: payouts[0].transactionId,
            method: payouts[0].paymentMethod,
            timestamp: payouts[0].timestamp
        }
        : null;

    const activePolicyPayload = activePolicy
        ? {
            coverage_amount: Number(activePolicy.coverageAmount || 0),
            max_payout_per_event: Number(activePolicy.maxPayoutPerEvent || 0)
        }
        : {
            coverage_amount: 0,
            max_payout_per_event: 0
        };

    const coverageStatus = activePolicy?.status === 'active' ? 'Active' : 'Inactive';
    const coverageUtilizedPercent = activePolicyPayload.coverage_amount > 0
        ? Math.min(100, Math.round((totalPayoutReceived / activePolicyPayload.coverage_amount) * 100))
        : 0;

    return {
        total_payout_received: Number(totalPayoutReceived.toFixed(2)),
        total_claims_approved: approvedClaimsCount,
        last_payout: lastPayout,
        coverage_status: coverageStatus,
        active_policy: activePolicyPayload,
        coverage_utilized_percent: coverageUtilizedPercent
    };
}

module.exports = {
    processPayout,
    processPayoutByClaim,
    retryPayout,
    getPayoutAnalytics,
    getPayoutsForUser,
    getPayoutSummary
};
