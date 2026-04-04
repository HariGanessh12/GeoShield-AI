const express = require('express');
const router = express.Router();
const financialService = require('../services/financialService');
const Claim = require('../models/claim');
const User = require('../models/user');
const { sendSuccess, sendError } = require('../utils/http');

// Simple In-Memory Cache
const cache = {
    dashboard: null,
    lastUpdated: null,
    TTL: 5 * 60 * 1000 // 5 minutes
};

router.get('/business', async (req, res) => {
    try {
        const metrics = await financialService.getBusinessMetrics();
        return sendSuccess(res, metrics);
    } catch (e) {
        return sendError(res, 500, "Could not fetch business metrics");
    }
});

router.get('/admin-dashboard', async (req, res) => {
    // Return cached data if valid
    if (cache.dashboard && cache.lastUpdated && (Date.now() - cache.lastUpdated < cache.TTL)) {
        return sendSuccess(res, { ...cache.dashboard, cached: true });
    }

    try {
        const metrics = await financialService.getBusinessMetrics();
        const totalClaimsCount = await Claim.countDocuments();
        const approvedClaimsCount = await Claim.countDocuments({ status: 'APPROVED' });
        
        let approvalRate = 0;
        if (totalClaimsCount > 0) {
            approvalRate = (approvedClaimsCount / totalClaimsCount) * 100;
        }

        // Aggregate workers grouped by zone
        const zonesDb = await User.aggregate([
            { $group: { _id: "$zone", userCount: { $sum: 1 } } }
        ]);

        const dashboardData = {
            financials: metrics,
            claims: {
                total: totalClaimsCount,
                approved: approvedClaimsCount,
                approvalRate: parseFloat(approvalRate.toFixed(2))
            },
            demographics: zonesDb
        };

        // Save to Cache
        cache.dashboard = dashboardData;
        cache.lastUpdated = Date.now();

        return sendSuccess(res, { ...dashboardData, cached: false });
    } catch (e) {
        return sendError(res, 500, "Failed to load dashboard metrics");
    }
});

module.exports = router;
