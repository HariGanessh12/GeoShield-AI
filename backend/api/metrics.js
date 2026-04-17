const express = require('express');
const router = express.Router();
const financialService = require('../services/financialService');
const Claim = require('../models/claim');
const User = require('../models/user');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/http');

const cache = {
    dashboard: null,
    lastUpdated: null,
    TTL: 5 * 60 * 1000
};

function derivePredictiveAnalytics(zones = [], lossRatio = 0) {
    return zones.map((zone) => {
        const userCount = Number(zone.userCount || 0);
        const expectedImpact = Math.round(userCount * (lossRatio > 0.8 ? 550 : 325));
        const normalizedRisk = lossRatio > 1 ? 'HIGH' : lossRatio > 0.7 ? 'MEDIUM' : 'LOW';
        return {
            id: `zone-${zone._id || 'na'}`,
            risk: normalizedRisk,
            description: `${zone._id || 'Unknown zone'} currently has ${userCount} insured workers and an expected short-term claim exposure of ₹${expectedImpact}.`,
            expectedImpact
        };
    });
}

router.get('/business', verifyAdmin, async (req, res) => {
    try {
        return sendSuccess(res, await financialService.getBusinessMetrics());
    } catch (error) {
        return sendError(res, 500, 'Could not fetch business metrics');
    }
});

router.get('/admin/financials', verifyAdmin, async (req, res) => {
    try {
        return sendSuccess(res, await financialService.getBusinessMetrics());
    } catch (error) {
        return sendError(res, 500, 'Could not fetch financial metrics');
    }
});

router.get('/admin-dashboard', verifyAdmin, async (req, res) => {
    if (cache.dashboard && cache.lastUpdated && (Date.now() - cache.lastUpdated < cache.TTL)) {
        return sendSuccess(res, { ...cache.dashboard, cached: true });
    }

    try {
        const [metrics, totalClaimsCount, approvedClaimsCount, zonesDb] = await Promise.all([
            financialService.getBusinessMetrics(),
            Claim.countDocuments(),
            Claim.countDocuments({ status: 'APPROVED' }),
            User.aggregate([{ $group: { _id: '$zone', userCount: { $sum: 1 } } }])
        ]);

        const approvalRate = totalClaimsCount > 0 ? Number(((approvedClaimsCount / totalClaimsCount) * 100).toFixed(2)) : 0;
        const dashboardData = {
            financials: metrics,
            claims: {
                total: totalClaimsCount,
                approved: approvedClaimsCount,
                approvalRate
            },
            demographics: zonesDb,
            predictiveAnalytics: derivePredictiveAnalytics(zonesDb, metrics.lossRatio)
        };

        cache.dashboard = dashboardData;
        cache.lastUpdated = Date.now();
        return sendSuccess(res, { ...dashboardData, cached: false });
    } catch (error) {
        return sendError(res, 500, 'Failed to load dashboard metrics');
    }
});

module.exports = router;
