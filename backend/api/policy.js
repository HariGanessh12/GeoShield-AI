const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Policy = require('../models/policy');
const { sendSuccess, sendError } = require('../utils/http');
const { createValidator, validators } = require('../utils/validation');
const { getExternalData } = require('../services/externalDataService');
const { spawn } = require('child_process');
const path = require('path');

const COVERED_EVENTS = ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE', 'AQI_SEVERE', 'TRAFFIC_SURGE'];

function personaMultiplier(personaType) {
    if (personaType === 'GROCERY_DELIVERY') return 1.15;
    if (personaType === 'BIKE_TAXI') return 1.3;
    return 1.0;
}

async function callRiskModel(inputData) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, '../../ai-engine/risk_model_v2.py'),
            JSON.stringify(inputData)
        ]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Risk model error:', stderr);
                reject(new Error(`Risk model failed: ${stderr}`));
                return;
            }

            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (e) {
                reject(new Error(`Failed to parse risk model output: ${e.message}`));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start risk model:', error);
            reject(error);
        });
    });
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

router.post('/quote', createValidator([
    { source: 'body', field: 'userId', check: validators.objectId('userId') }
]), async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return sendError(res, 404, "User not found");

        // Get claim history for credibility calculation
        const claimHistory = await require('../models/claim').find(
            { workerId: userId },
            { status: 1, amount: 1, createdAt: 1 }
        ).sort({ createdAt: -1 }).limit(20).lean();

        // Get external data
        const [heatwave, rain, outage, aqi, traffic] = await Promise.all([
            getExternalData('HEATWAVE', user.zone),
            getExternalData('HEAVY_RAIN', user.zone),
            getExternalData('PLATFORM_OUTAGE', user.zone),
            getExternalData('AQI_SEVERE', user.zone),
            getExternalData('TRAFFIC_SURGE', user.zone)
        ]);

        // Calculate weighted severity for backward compatibility
        const weightedSeverity = (
            heatwave.severityScore * 0.24 +
            rain.severityScore * 0.22 +
            outage.severityScore * 0.16 +
            aqi.severityScore * 0.18 +
            traffic.severityScore * 0.2
        );

        // Call advanced risk model
        const riskInput = {
            weather: weightedSeverity * 100,  // Convert to 0-100 scale
            traffic: traffic.severityScore * 100,
            location: (heatwave.severityScore + rain.severityScore + aqi.severityScore) / 3 * 100,
            persona_type: user.personaType || 'FOOD_DELIVERY',
            reputation_score: user.reputationScore || 85,
            claim_history: claimHistory.map(c => ({ status: c.status, approved: c.status === 'APPROVED' })),
            zone: user.zone
        };

        const riskResult = await callRiskModel(riskInput);

        return sendSuccess(res, {
            quote: riskResult.weekly_premium_inr,
            breakdown: riskResult.breakdown,
            risk_level: riskResult.risk_level,
            risk_score: riskResult.risk_score,
            expected_loss: riskResult.expected_loss,
            loss_ratio_projection: riskResult.loss_ratio_projection,
            credibility: riskResult.credibility,
            coverageAmount: 3500,
            signals: {
                heatwave: heatwave.severityScore,
                rain: rain.severityScore,
                outage: outage.severityScore,
                aqi: aqi.severityScore,
                traffic: traffic.severityScore,
                weightedSeverity: Number(weightedSeverity.toFixed(2))
            }
        });
    } catch (e) {
        console.error("Pricing error:", e);
        return sendError(res, 500, "Pricing engine failed");
    }
});

router.post('/activate', createValidator([
    { source: 'body', field: 'userId', check: validators.objectId('userId') },
    { source: 'body', field: 'premiumPaid', check: validators.optionalNumber('premiumPaid', 0) },
    { source: 'body', field: 'coverageAmount', check: validators.optionalNumber('coverageAmount', 0) }
]), async (req, res) => {
    try {
        const { userId, premiumPaid, coverageAmount } = req.body;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 7);

        let policy = await Policy.findOne({ workerId: userId, status: 'active' }).sort({ createdAt: -1 });
        if (policy) {
            policy.startDate = startDate;
            policy.endDate = endDate;
            policy.premiumPaid = premiumPaid;
            policy.coverageAmount = coverageAmount || policy.coverageAmount;
            policy.status = 'active';
            await policy.save();
        } else {
            policy = await Policy.create({
                workerId: userId,
                startDate,
                endDate,
                premiumPaid,
                coverageAmount,
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

        const allowedUpdates = ['coverageAmount', 'maxPayoutPerEvent', 'coveredEvents'];
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
