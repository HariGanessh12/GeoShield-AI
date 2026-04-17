const crypto = require('crypto');
const Claim = require('../models/claim');

/**
 * Mocks an instant payout flow to a user's bank or UPI.
 * 
 * @param {Object} claim The approved claim document
 * @returns {Promise<Object>} The updated claim and transaction details
 */
async function processPayout(claim) {
    if (!claim || claim.status !== 'APPROVED') {
        throw new Error("Payout can only be processed for APPROVED claims.");
    }

    // Simulate API delay from a payment gateway (e.g., Razorpay/Stripe)
    await new Promise(resolve => setTimeout(resolve, 800));

    // 95% success rate simulation
    const isSuccess = Math.random() < 0.95;
    
    const transactionId = `txn_${crypto.randomBytes(8).toString('hex')}`;
    const payoutStatus = isSuccess ? 'COMPLETED' : 'FAILED';
    const transactionNote = isSuccess 
        ? "Instant UPI payout processed successfully" 
        : "Bank server declined the transaction";

    // Update claim with transaction details
    claim.transactionId = transactionId;
    claim.payoutStatus = payoutStatus;
    
    // In a real system, you might append to reasons or resolutionNote, but setting properties is fine.
    await claim.save();

    return {
        transactionId,
        payoutStatus,
        transactionNote,
        amount: claim.payout
    };
}

module.exports = {
    processPayout
};
