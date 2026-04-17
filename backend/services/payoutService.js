const crypto = require('crypto');
const Claim = require('../models/claim');

// Simulated payment gateway configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo_key';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'demo_secret';

// Mock bank account details (in production, stored securely per user)
const mockBankAccounts = {
    // In production, this would be encrypted in database
};

/**
 * Processes instant payout to user's bank/UPI
 * Simulates Razorpay/Stripe integration
 */
async function processPayout(claim) {
    if (!claim || claim.status !== 'APPROVED') {
        throw new Error("Payout can only be processed for APPROVED claims.");
    }

    if (!claim.workerId) {
        throw new Error("Claim must be associated with a worker");
    }

    try {
        // Simulate payment gateway API call
        const payoutResult = await simulatePaymentGateway(claim);

        // Update claim with transaction details
        claim.transactionId = payoutResult.transactionId;
        claim.payoutStatus = payoutResult.status;
        claim.payoutProcessedAt = new Date();
        claim.payoutMethod = payoutResult.method;

        if (payoutResult.status === 'COMPLETED') {
            claim.resolutionNote = `Payout of ₹${claim.payout} processed successfully via ${payoutResult.method}`;
        } else {
            claim.resolutionNote = `Payout failed: ${payoutResult.failureReason}`;
        }

        await claim.save();

        return {
            transactionId: payoutResult.transactionId,
            payoutStatus: payoutResult.status,
            amount: claim.payout,
            method: payoutResult.method,
            estimatedSettlement: payoutResult.estimatedSettlement,
            failureReason: payoutResult.failureReason
        };

    } catch (error) {
        console.error('Payout processing error:', error);
        claim.payoutStatus = 'FAILED';
        claim.resolutionNote = `Payout error: ${error.message}`;
        await claim.save();
        throw error;
    }
}

/**
 * Simulates payment gateway API call
 */
async function simulatePaymentGateway(claim) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const transactionId = `rzp_${crypto.randomBytes(12).toString('hex')}`;

    // Simulate various failure scenarios (5% failure rate)
    const failureScenarios = [
        { reason: 'Insufficient funds in merchant account', probability: 0.3 },
        { reason: 'Bank server timeout', probability: 0.3 },
        { reason: 'Invalid UPI ID', probability: 0.2 },
        { reason: 'Account frozen by bank', probability: 0.15 },
        { reason: 'Transaction amount exceeds daily limit', probability: 0.05 }
    ];

    const random = Math.random();
    if (random < 0.05) { // 5% failure rate
        let cumulativeProb = 0;
        let failureReason = 'Unknown error';

        for (const scenario of failureScenarios) {
            cumulativeProb += scenario.probability;
            if (random < cumulativeProb) {
                failureReason = scenario.reason;
                break;
            }
        }

        return {
            transactionId,
            status: 'FAILED',
            method: 'UPI',
            failureReason,
            estimatedSettlement: null
        };
    }

    // Success case
    const methods = ['UPI', 'IMPS', 'NEFT'];
    const method = methods[Math.floor(Math.random() * methods.length)];

    // Settlement time based on method
    const settlementTimes = {
        'UPI': 'Instant',
        'IMPS': '2-3 hours',
        'NEFT': '1-2 business days'
    };

    return {
        transactionId,
        status: 'COMPLETED',
        method,
        estimatedSettlement: settlementTimes[method],
        failureReason: null
    };
}

/**
 * Retry failed payout (for reconciliation job)
 */
async function retryPayout(claimId) {
    const claim = await Claim.findById(claimId);
    if (!claim || claim.payoutStatus !== 'FAILED') {
        throw new Error('Invalid claim for retry');
    }

    // Reset status and try again
    claim.payoutStatus = 'PENDING';
    await claim.save();

    return await processPayout(claim);
}

/**
 * Get payout analytics
 */
async function getPayoutAnalytics(timeframe = '30d') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    const payouts = await Claim.find({
        payoutStatus: { $in: ['COMPLETED', 'FAILED'] },
        payoutProcessedAt: { $gte: startDate }
    });

    const totalAmount = payouts.reduce((sum, claim) => sum + (claim.payout || 0), 0);
    const successCount = payouts.filter(p => p.payoutStatus === 'COMPLETED').length;
    const failureCount = payouts.filter(p => p.payoutStatus === 'FAILED').length;
    const successRate = payouts.length > 0 ? (successCount / payouts.length) * 100 : 0;

    return {
        totalPayouts: payouts.length,
        totalAmount,
        successCount,
        failureCount,
        successRate: Math.round(successRate * 100) / 100,
        averageAmount: payouts.length > 0 ? Math.round(totalAmount / payouts.length) : 0
    };
}

module.exports = {
    processPayout,
    retryPayout,
    getPayoutAnalytics
};
