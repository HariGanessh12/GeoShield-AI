const Claim = require('../models/claim');
const Policy = require('../models/policy');
const User = require('../models/user');

function roundCurrency(value) {
    return Number((value || 0).toFixed(2));
}

async function getBusinessMetrics() {
    try {
        const [totalUsers, policySummary, claimsSummary] = await Promise.all([
            User.countDocuments({ role: 'worker' }),
            Policy.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPremiumCollected: { $sum: { $ifNull: ['$premiumPaid', 0] } },
                        avgPremium: { $avg: { $ifNull: ['$premiumPaid', 0] } }
                    }
                }
            ]),
            Claim.aggregate([
                { $match: { status: 'APPROVED' } },
                {
                    $group: {
                        _id: null,
                        totalClaimsPaid: { $sum: { $ifNull: ['$payout', 0] } }
                    }
                }
            ])
        ]);

        const totalPremiumCollected = Number(policySummary[0]?.totalPremiumCollected || 0);
        const avgPremium = Number(policySummary[0]?.avgPremium || 0);
        const totalClaimsPaid = Number(claimsSummary[0]?.totalClaimsPaid || 0);
        const profit = totalPremiumCollected - totalClaimsPaid;
        const lossRatio = totalPremiumCollected > 0 ? totalClaimsPaid / totalPremiumCollected : 0;

        let status = 'HEALTHY';
        if (lossRatio > 0.8) status = 'AT_RISK';
        if (lossRatio > 1.0) status = 'UNPROFITABLE';

        return {
            totalUsers,
            avgPremium: roundCurrency(avgPremium),
            totalPremium: roundCurrency(totalPremiumCollected),
            totalClaims: roundCurrency(totalClaimsPaid),
            profit: roundCurrency(profit),
            lossRatio: roundCurrency(lossRatio),
            status
        };
    } catch (e) {
        console.error("Error calculating business metrics:", e);
        return { 
            totalUsers: 0, 
            avgPremium: 0, 
            totalPremium: 0, 
            totalClaims: 0, 
            profit: 0,
            lossRatio: 0, 
            status: 'ERROR' 
        };
    }
}

module.exports = { getBusinessMetrics };
