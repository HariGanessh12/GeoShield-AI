const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Policy = require('../models/policy');
const { sendSuccess, sendError } = require('../utils/http');
const { createValidator, validators } = require('../utils/validation');

router.get('/current', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return sendError(res, 401, "Unauthorized");
        }

        const policy = await Policy.findOne({ workerId: req.user.id }).sort({ createdAt: -1 });
        return sendSuccess(res, { policy });
    } catch (e) {
        console.error("Current policy fetch error:", e);
        return sendError(res, 500, "Could not fetch current policy");
    }
});

// Dynamically Calculate Weekly Premium based on AI Constraints
router.post('/quote', createValidator([
    { source: 'body', field: 'userId', check: validators.objectId('userId') }
]), async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return sendError(res, 404, "User not found");

        // Base Weekly Premium
        let basePremium = 50; 
        
        // Dynamic Risk Assessment Factor
        let zoneRiskSurcharge = 0;
        if (user.zone === 'Delhi NCR') zoneRiskSurcharge = 25; // Heatwave & Pollution Risk Level 4
        else if (user.zone === 'Mumbai South') zoneRiskSurcharge = 35; // Flooding Risk Level 5
        else if (user.zone === 'Bangalore Central') zoneRiskSurcharge = 15; // Moderate Risk Level 2

        // Automated AI Reputation Discount Model
        // Subtracts 1 Rupee per reputation point above 80
        const reputationBonus = Math.max(0, user.reputationScore - 80);
        const maxDiscount = 15;
        const appliedDiscount = Math.min(maxDiscount, reputationBonus);
        
        const finalPremium = basePremium + zoneRiskSurcharge - appliedDiscount;

        return sendSuccess(res, { 
            quote: finalPremium, 
            breakdown: {
                base: basePremium,
                zoneSurcharge: zoneRiskSurcharge,
                reputationDiscount: appliedDiscount
            },
            coverageAmount: 3500 
        });
    } catch (e) {
        console.error("Pricing error:", e);
        return sendError(res, 500, "Pricing engine failed");
    }
});

// Mocked Payment Implementation / Policy Subscription
router.post('/activate', createValidator([
    { source: 'body', field: 'userId', check: validators.objectId('userId') },
    { source: 'body', field: 'premiumPaid', check: validators.optionalNumber('premiumPaid', 0) },
    { source: 'body', field: 'coverageAmount', check: validators.optionalNumber('coverageAmount', 0) }
]), async (req, res) => {
    try {
        const { userId, premiumPaid, coverageAmount } = req.body;
        
        // Set Weekly constraint: 7 Day active window from execution
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);

        const policy = await Policy.create({
            workerId: userId,
            startDate,
            endDate,
            premiumPaid,
            coverageAmount,
            status: 'active'
        });

        return sendSuccess(res, { message: "Weekly Policy Activated successfully", policy });
    } catch (e) {
        console.error("Activation error:", e);
        return sendError(res, 500, "Failed to activate weekly policy");
    }
});

module.exports = router;
