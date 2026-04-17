const express = require('express');
const router = express.Router();
const SystemStatus = require('../models/systemStatus');
const { sendSuccess, sendError } = require('../utils/http');

router.get('/status', async (req, res) => {
    try {
        const status = await SystemStatus.findOne({ name: 'automatedTriggerMonitor' }).lean();
        if (!status) {
            return sendSuccess(res, {
                last_scan_time: null,
                next_scan_time: null,
                last_trigger_detected: null,
                last_auto_claim_created: null,
                triggersDetected: [],
                scanIntervalMinutes: 15
            });
        }

        return sendSuccess(res, {
            last_scan_time: status.lastScanAt,
            next_scan_time: status.nextScanAt,
            last_trigger_detected: status.lastTriggerDetected || null,
            last_auto_claim_created: status.lastAutoClaimCreated || null,
            triggersDetected: status.triggersDetected || [],
            scanIntervalMinutes: status.scanIntervalMinutes || 15
        });
    } catch (error) {
        console.error('System status fetch failed:', error);
        return sendError(res, 500, 'Could not fetch system status');
    }
});

module.exports = router;
