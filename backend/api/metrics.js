const express = require('express');
const router = express.Router();
const financialService = require('../services/financialService');
const Claim = require('../models/claim');
const User = require('../models/user');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/http');

// Simple In-Memory Cache
const cache = {
    dashboard: null,
    lastUpdated: null,
    TTL: 5 * 60 * 1000 // 5 minutes
};

router.get('/business', verifyAdmin, async (req, res) => {
    try {
        const metrics = await financialService.getBusinessMetrics();
        return sendSuccess(res, metrics);
    } catch (e) {
        return sendError(res, 500, "Could not fetch business metrics");
    }
});

router.get('/admin/financials', verifyAdmin, async (req, res) => {
    try {
        const metrics = await financialService.getBusinessMetrics();
        return sendSuccess(res, metrics);
    } catch (e) {
        return sendError(res, 500, "Could not fetch financial metrics");
    }
});

router.get('/admin-dashboard', verifyAdmin, async (req, res) => {
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
            demographics: zonesDb,
            predictiveAnalytics: [
                { id: "p1", risk: "HIGH", description: "Delhi NCR air quality is trending into the severe band for the evening commute. Expect higher manual reviews for respiratory disruption claims.", expectedImpact: 28000 },
                { id: "p2", risk: "MEDIUM", description: "Intermittent rainfall cells are building along the Gurgaon and South Delhi corridors. Short-shift payout demand may rise during the next 24 hours.", expectedImpact: 16500 },
                { id: "p3", risk: "LOW", description: "Platform uptime and traffic velocity remain stable across Bangalore Central. No unusual claims pressure is expected tonight.", expectedImpact: 4200 }
            ]
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
