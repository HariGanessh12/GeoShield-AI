const Claim = require('../models/claim');
const Policy = require('../models/policy');

async function getBusinessMetrics() {
    try {
        // Calculate Total Premium Collected
        const policies = await Policy.find();
        let totalPremiumCollected = 0;
        policies.forEach(p => totalPremiumCollected += p.premiumPaid);

        // Calculate Total Claims Paid
        const claims = await Claim.find({ status: 'APPROVED' });
        let totalClaimsPaid = 0;
        claims.forEach(c => totalClaimsPaid += c.payout);

        // Determine Loss Ratio
        let lossRatio = 0;
        if (totalPremiumCollected > 0) {
            lossRatio = totalClaimsPaid / totalPremiumCollected;
        }

        // Determine Portfolio Status
        let status = 'HEALTHY';
        if (lossRatio > 0.8) status = 'AT_RISK';
        if (lossRatio > 1.0) status = 'UNPROFITABLE';

        return {
            totalPremium: totalPremiumCollected,
            totalClaims: totalClaimsPaid,
            lossRatio: parseFloat(lossRatio.toFixed(2)),
            status
        };
    } catch (e) {
        console.error("Error calculating business metrics:", e);
        return { totalPremium: 0, totalClaims: 0, lossRatio: 0, status: 'ERROR' };
    }
}

module.exports = { getBusinessMetrics };
