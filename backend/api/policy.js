const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Policy = require('../models/policy');
const { sendSuccess, sendError } = require('../utils/http');
const { createValidator, validators } = require('../utils/validation');
const { getExternalData } = require('../services/externalDataService');
const { calculatePremium } = require('../services/riskCalculator');
const POLICY_RULES = require('../config/policyRules');

// Event type constants - eliminates hardcoded strings
const EVENTS = {
    HEATWAVE: 'HEATWAVE',
    HEAVY_RAIN: 'HEAVY_RAIN',
    PLATFORM_OUTAGE: 'PLATFORM_OUTAGE',
    AQI_SEVERE: 'AQI_SEVERE',
    TRAFFIC_SURGE: 'TRAFFIC_SURGE'
};

// Event severity weights for premium calculation
const EVENT_WEIGHTS = {
    [EVENTS.HEATWAVE]: 0.24,
    [EVENTS.HEAVY_RAIN]: 0.22,
    [EVENTS.PLATFORM_OUTAGE]: 0.16,
    [EVENTS.AQI_SEVERE]: 0.18,
    [EVENTS.TRAFFIC_SURGE]: 0.2
};

// Location risk factors (weather events affecting location risk)
const LOCATION_RISK_EVENTS = [EVENTS.HEATWAVE, EVENTS.HEAVY_RAIN, EVENTS.AQI_SEVERE];

const COVERED_EVENTS = ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE', 'AQI_SEVERE', 'TRAFFIC_SURGE'];

function personaMultiplier(personaType) {
    if (personaType === 'GROCERY_DELIVERY') return 1.15;
    if (personaType === 'BIKE_TAXI') return 1.3;
    return 1.0;
}

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

router.get('/history', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return sendError(res, 401, "Unauthorized");
        }

        const policies = await Policy.find({ workerId: req.user.id }).sort({ createdAt: -1 }).limit(10);
        return sendSuccess(res, { policies });
    } catch (e) {
        console.error("Policy history error:", e);
        return sendError(res, 500, "Could not fetch policy history");
    }
});

router.get('/terms', async (req, res) => {
    try {
        return sendSuccess(res, POLICY_RULES);
    } catch (error) {
        return sendError(res, 500, 'Could not load policy terms');
    }
});

router.post('/quote', createValidator([
    { source: 'body', field: 'userId', check: validators.objectId('userId') }
]), async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return sendError(res, 404, "User not found");

        // Get claim history for credibility calculation
        let claimHistory = [];
        try {
            claimHistory = await require('../models/claim').find(
                { workerId: userId },
                { status: 1, amount: 1, createdAt: 1 }
            ).sort({ createdAt: -1 }).limit(20).lean();
        } catch (err) {
            console.warn('[Policy/Quote] Failed to fetch claim history:', err.message);
            // Continue without claim history - not a critical failure
        }

        // Fetch all external event data in parallel
        let eventData = {};
        try {
            const [heatwave, rain, outage, aqi, traffic] = await Promise.all([
                getExternalData(EVENTS.HEATWAVE, user.zone).catch(err => {
                    console.warn(`[Policy/Quote] ${EVENTS.HEATWAVE} fetch failed:`, err.message);
                    return { severityScore: 0.4, eventType: EVENTS.HEATWAVE, source: 'error_fallback' };
                }),
                getExternalData(EVENTS.HEAVY_RAIN, user.zone).catch(err => {
                    console.warn(`[Policy/Quote] ${EVENTS.HEAVY_RAIN} fetch failed:`, err.message);
                    return { severityScore: 0.4, eventType: EVENTS.HEAVY_RAIN, source: 'error_fallback' };
                }),
                getExternalData(EVENTS.PLATFORM_OUTAGE, user.zone).catch(err => {
                    console.warn(`[Policy/Quote] ${EVENTS.PLATFORM_OUTAGE} fetch failed:`, err.message);
                    return { severityScore: 0.4, eventType: EVENTS.PLATFORM_OUTAGE, source: 'error_fallback' };
                }),
                getExternalData(EVENTS.AQI_SEVERE, user.zone).catch(err => {
                    console.warn(`[Policy/Quote] ${EVENTS.AQI_SEVERE} fetch failed:`, err.message);
                    return { severityScore: 0.4, eventType: EVENTS.AQI_SEVERE, source: 'error_fallback' };
                }),
                getExternalData(EVENTS.TRAFFIC_SURGE, user.zone).catch(err => {
                    console.warn(`[Policy/Quote] ${EVENTS.TRAFFIC_SURGE} fetch failed:`, err.message);
                    return { severityScore: 0.4, eventType: EVENTS.TRAFFIC_SURGE, source: 'error_fallback' };
                })
            ]);

            // Store in object with proper keys
            eventData = {
                [EVENTS.HEATWAVE]: heatwave,
                [EVENTS.HEAVY_RAIN]: rain,
                [EVENTS.PLATFORM_OUTAGE]: outage,
                [EVENTS.AQI_SEVERE]: aqi,
                [EVENTS.TRAFFIC_SURGE]: traffic
            };
        } catch (err) {
            console.error('[Policy/Quote] External data fetch failed:', err.message);
            // Set safe defaults if all external data fails
            eventData = {
                [EVENTS.HEATWAVE]: { severityScore: 0.4 },
                [EVENTS.HEAVY_RAIN]: { severityScore: 0.4 },
                [EVENTS.PLATFORM_OUTAGE]: { severityScore: 0.4 },
                [EVENTS.AQI_SEVERE]: { severityScore: 0.4 },
                [EVENTS.TRAFFIC_SURGE]: { severityScore: 0.4 }
            };
        }

        // Calculate weighted severity using EVENT_WEIGHTS constant
        const weightedSeverity = Object.entries(EVENT_WEIGHTS).reduce((sum, [eventType, weight]) => {
            const score = eventData[eventType]?.severityScore || 0.4;
            return sum + (score * weight);
        }, 0);

        // Calculate location risk from weather events
        const locationRiskScore = LOCATION_RISK_EVENTS.reduce((sum, eventType) => {
            return sum + (eventData[eventType]?.severityScore || 0.4);
        }, 0) / LOCATION_RISK_EVENTS.length;

        // Build risk model input
        const avgPayoutPerEvent = Math.max(400, Number(user.coverageAmount || 3500) * 0.2);
        const riskInput = {
            weather: weightedSeverity * 100,
            traffic: (eventData[EVENTS.TRAFFIC_SURGE]?.severityScore || 0.4) * 100,
            location: locationRiskScore * 100,
            persona_type: user.personaType || 'FOOD_DELIVERY',
            reputation_score: user.reputationScore || 85,
            claim_history: (claimHistory || []).map(c => ({ status: c.status, approved: c.status === 'APPROVED' })),
            zone: user.zone,
            avg_payout_per_event: avgPayoutPerEvent
        };

        let riskResult;
        try {
            riskResult = calculatePremium(riskInput);
        } catch (err) {
            console.error('[Policy/Quote] Risk calculation failed:', err.message);
            return sendError(res, 500, "Premium calculation failed. Please try again.");
        }

        // Build signals object safely from eventData
        const signals = {};
        Object.entries(EVENTS).forEach(([key, eventType]) => {
            signals[key.toLowerCase()] = eventData[eventType]?.severityScore || 0.4;
        });
        signals.weightedSeverity = Number(weightedSeverity.toFixed(2));

        return sendSuccess(res, {
            quote: riskResult.final_premium,
            coverageAmount: 3500,
            breakdown: {
                base_premium: riskResult.base_premium,
                risk_adjustment: riskResult.risk_adjustment ?? riskResult.risk_margin,
                platform_fee: riskResult.platform_fee,
                final_premium: riskResult.final_premium
            },
            risk_level: riskResult.risk_level,
            risk_score: riskResult.risk_score,
            signals,
            _meta: {
                zone: user.zone,
                personaType: user.personaType,
                reputationScore: user.reputationScore,
                timestamp: new Date().toISOString(),
                data_label: Object.values(eventData).some((entry) => entry.apiUsed) ? 'Live data' : 'Simulated data (fallback)'
            }
        });
    } catch (e) {
        console.error('[Policy/Quote] Unhandled error:', e.message, e.stack);
        return sendError(res, 500, "Pricing engine failed");
    }
});

router.post('/activate', createValidator([
    { source: 'body', field: 'userId', check: validators.objectId('userId') },
    { source: 'body', field: 'premiumPaid', check: validators.optionalNumber('premiumPaid', 0) },
    { source: 'body', field: 'coverageAmount', check: validators.optionalNumber('coverageAmount', 0) },
    { source: 'body', field: 'payoutMultiplier', check: validators.optionalNumber('payoutMultiplier', 2, 3) }
]), async (req, res) => {
    try {
        const { userId, premiumPaid, coverageAmount } = req.body;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);

        let policy = await Policy.findOne({ workerId: userId, status: 'active' }).sort({ createdAt: -1 });
        const weeklyPremium = Number(premiumPaid || 0);
        if (policy) {
            policy.startDate = startDate;
            policy.endDate = endDate;
            policy.premiumPaid = weeklyPremium;
            policy.coverageAmount = coverageAmount || policy.coverageAmount;
            policy.totalPremiumCollected = weeklyPremium;
            policy.totalClaimsPaid = policy.totalClaimsPaid || 0;
            policy.lossRatio = policy.totalPremiumCollected > 0
                ? policy.totalClaimsPaid / policy.totalPremiumCollected
                : 0;
            policy.payoutMultiplier = req.body.payoutMultiplier || policy.payoutMultiplier || 3;
            policy.status = 'active';
            await policy.save();
        } else {
            policy = await Policy.create({
                workerId: userId,
                startDate,
                endDate,
                premiumPaid: weeklyPremium,
                coverageAmount,
                totalPremiumCollected: weeklyPremium,
                totalClaimsPaid: 0,
                lossRatio: 0,
                payoutMultiplier: req.body.payoutMultiplier || 3,
                status: 'active'
            });
        }

        return sendSuccess(res, { message: "Weekly Policy Activated successfully", policy });
    } catch (e) {
        console.error("Activation error:", e);
        return sendError(res, 500, "Failed to activate weekly policy");
    }
});

router.put('/current', createValidator([
    { source: 'body', field: 'coverageAmount', check: validators.optionalNumber('coverageAmount', 500, 10000) },
    { source: 'body', field: 'maxPayoutPerEvent', check: validators.optionalNumber('maxPayoutPerEvent', 250, 5000) },
    { source: 'body', field: 'payoutMultiplier', check: validators.optionalNumber('payoutMultiplier', 2, 3) },
    { source: 'body', field: 'coveredEvents', check: validators.stringArrayEnum('coveredEvents', COVERED_EVENTS, { min: 1, optional: true }) }
]), async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return sendError(res, 401, "Unauthorized");
        }

        const policy = await Policy.findOne({ workerId: req.user.id }).sort({ createdAt: -1 });
        if (!policy) {
            return sendError(res, 404, "No policy found");
        }

        const allowedUpdates = ['coverageAmount', 'maxPayoutPerEvent', 'payoutMultiplier', 'coveredEvents'];
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                policy[field] = req.body[field];
            }
        }

        await policy.save();
        return sendSuccess(res, { message: "Policy updated", policy });
    } catch (e) {
        console.error("Policy update error:", e);
        return sendError(res, 500, "Could not update policy");
    }
});

router.post('/cancel', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return sendError(res, 401, "Unauthorized");
        }

        const policy = await Policy.findOne({ workerId: req.user.id }).sort({ createdAt: -1 });
        if (!policy) {
            return sendError(res, 404, "No policy found");
        }

        policy.status = 'cancelled';
        policy.shiftState = 'OFF';
        await policy.save();

        return sendSuccess(res, { message: "Policy cancelled", policy });
    } catch (e) {
        console.error("Policy cancel error:", e);
        return sendError(res, 500, "Could not cancel policy");
    }
});

module.exports = router;
