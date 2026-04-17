const express = require('express');
const router = express.Router();
const SystemStatus = require('../models/systemStatus');
const { sendSuccess, sendError } = require('../utils/http');

router.get('/status', async (req, res) => {
    try {
        const status = await SystemStatus.findOne({ name: 'automatedTriggerMonitor' }).lean();
        if (!status) {
            return sendSuccess(res, {
                lastScanAt: null,
                nextScanAt: null,
                lastTriggerDetected: null,
                triggersDetected: [],
                scanIntervalMinutes: 15
            });
        }

        return sendSuccess(res, {
            lastScanAt: status.lastScanAt,
            nextScanAt: status.nextScanAt,
            lastTriggerDetected: status.lastTriggerDetected,
            triggersDetected: status.triggersDetected || [],
            scanIntervalMinutes: status.scanIntervalMinutes || 15
        });
    } catch (error) {
        console.error('System status fetch failed:', error);
        return sendError(res, 500, 'Could not fetch system status');
    }
});

module.exports = router;
