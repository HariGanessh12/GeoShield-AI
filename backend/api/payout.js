const express = require('express');
const router = express.Router();
const Claim = require('../models/claim');
const { sendSuccess, sendError } = require('../utils/http');
const payoutService = require('../services/payoutService');

router.post('/process', async (req, res) => {
    try {
        const { claimId, userId, amount, payment_method } = req.body || {};
        if (!claimId || !userId || amount === undefined) {
            return sendError(res, 400, 'claimId, userId, and amount are required');
        }

        const result = await payoutService.processPayoutByClaim({
            claimId,
            userId,
            amount,
            paymentMethod: payment_method
        });

        return sendSuccess(res, result);
    } catch (error) {
        return sendError(res, 500, error.message || 'Could not process payout');
    }
});

router.get('/history', async (req, res) => {
    try {
        const targetUserId = req.user?.role === 'admin' && req.query.userId
            ? String(req.query.userId)
            : String(req.user?.id);

        const payouts = await payoutService.getPayoutsForUser(targetUserId);
        return sendSuccess(res, { payouts });
    } catch (error) {
        return sendError(res, 500, 'Could not fetch payout history');
    }
});

router.get('/summary', async (req, res) => {
    try {
        const targetUserId = req.user?.role === 'admin' && req.query.userId
            ? String(req.query.userId)
            : String(req.user?.id);

        const summary = await payoutService.getPayoutSummary(targetUserId);
        return sendSuccess(res, summary);
    } catch (error) {
        return sendError(res, 500, 'Could not fetch payout summary');
    }
});

router.get('/claim/:claimId', async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.claimId).lean();
        if (!claim) return sendError(res, 404, 'Claim not found');
        return sendSuccess(res, {
            claimId: String(claim._id),
            transaction_id: claim.transactionId,
            status: claim.payoutStatus,
            amount: claim.payout,
            payment_method: claim.payoutMethod,
            timestamp: claim.payoutProcessedAt
        });
    } catch (error) {
        return sendError(res, 500, 'Could not fetch claim payout');
    }
});

module.exports = router;
