const express = require('express');
const router = express.Router();
const financialService = require('../services/financialService');
const { sendSuccess, sendError } = require('../utils/http');

router.get('/financials', async (req, res) => {
    try {
        return sendSuccess(res, await financialService.getBusinessMetrics());
    } catch (error) {
        return sendError(res, 500, 'Could not fetch financial metrics');
    }
});

module.exports = router;
