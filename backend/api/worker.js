const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Policy = require('../models/policy');
const PolicyToggleLog = require('../models/policyToggleLog');
const Claim = require('../models/claim');
const { sendSuccess, sendError } = require('../utils/http');
const { createValidator, validators } = require('../utils/validation');

function canAccessWorker(req, workerId) {
    if (!req.user) return false;
    return req.user.role === 'admin' || String(req.user.id) === String(workerId);
}

function normalizeState(value) {
    return String(value || '').toUpperCase() === 'ON' ? 'ON' : 'OFF';
}

async function loadCurrentState(workerId) {
    const policy = await Policy.findOne({ workerId }).sort({ createdAt: -1 });
    const latestLog = await PolicyToggleLog.findOne({ workerId }).sort({ createdAt: -1 });
    return {
        policy,
        latestLog,
        currentState: latestLog?.currentState || policy?.shiftState || 'OFF'
    };
}

router.get('/:id/summary', createValidator([
    { source: 'params', field: 'id', check: validators.objectId('id') }
]), async (req, res) => {
    try {
        const { id } = req.params;
        if (!canAccessWorker(req, id)) {
            return sendError(res, 403, 'Access denied for this worker profile');
        }

        const [user, policyState, recentClaims, recentToggles] = await Promise.all([
            User.findById(id, '-password').lean(),
            loadCurrentState(id),
            Claim.find({ workerId: id }).sort({ createdAt: -1 }).limit(5).lean(),
            PolicyToggleLog.find({ workerId: id }).sort({ createdAt: -1 }).limit(10).lean()
        ]);

        if (!user) {
            return sendError(res, 404, 'Worker not found');
        }

        return sendSuccess(res, {
            profile: user,
            currentPolicy: policyState.policy,
            shiftState: policyState.currentState,
            recentClaims,
            recentToggles
        });
    } catch (error) {
        console.error('Worker summary error:', error);
        return sendError(res, 500, 'Could not load worker summary');
    }
});

router.post('/:id/policy/toggle', createValidator([
    { source: 'params', field: 'id', check: validators.objectId('id') },
    { source: 'body', field: 'state', check: validators.policyState() }
]), async (req, res) => {
    try {
        const { id } = req.params;
        const requestedState = req.body.state ? normalizeState(req.body.state) : null;

        if (!canAccessWorker(req, id)) {
            return sendError(res, 403, 'Access denied for this worker policy');
        }

        const user = await User.findById(id).lean();
        if (!user) {
            return sendError(res, 404, 'Worker not found');
        }

        const now = new Date();
        let policy = await Policy.findOne({ workerId: id }).sort({ createdAt: -1 });

        if (!policy) {
            policy = await Policy.create({
                workerId: id,
                startDate: now,
                endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                premiumPaid: 0,
                coverageAmount: 3500,
                status: 'active',
                shiftState: 'OFF',
                toggleCount: 0
            });
        }

        const currentState = policy.shiftState || 'OFF';
        const nextState = requestedState || (currentState === 'ON' ? 'OFF' : 'ON');

        // The business value here is the on-shift/off-shift split: workers only pay for protection when they are actually working.
        policy.shiftState = nextState;
        policy.lastToggledAt = now;
        policy.toggleCount = (policy.toggleCount || 0) + 1;
        await policy.save();

        const log = await PolicyToggleLog.create({
            workerId: id,
            previousState: currentState,
            currentState: nextState,
            reason: req.body.reason || 'manual_toggle',
            source: req.body.source || 'web_app'
        });

        return sendSuccess(res, {
            workerId: id,
            profile: {
                id: user._id,
                email: user.email,
                role: user.role,
                zone: user.zone,
                reputationScore: user.reputationScore
            },
            policy: {
                id: policy._id,
                shiftState: policy.shiftState,
                status: policy.status,
                toggleCount: policy.toggleCount,
                lastToggledAt: policy.lastToggledAt
            },
            toggle: log
        });
    } catch (error) {
        console.error('Policy toggle error:', error);
        return sendError(res, 500, 'Could not toggle worker policy');
    }
});

router.get('/:id/policy/history', createValidator([
    { source: 'params', field: 'id', check: validators.objectId('id') }
]), async (req, res) => {
    try {
        const { id } = req.params;
        if (!canAccessWorker(req, id)) {
            return sendError(res, 403, 'Access denied for this worker policy history');
        }

        const [state, history] = await Promise.all([
            loadCurrentState(id),
            PolicyToggleLog.find({ workerId: id }).sort({ createdAt: -1 }).limit(20).lean()
        ]);

        return sendSuccess(res, {
            workerId: id,
            shiftState: state.currentState,
            toggleCount: history.length,
            history
        });
    } catch (error) {
        console.error('Policy history error:', error);
        return sendError(res, 500, 'Could not load policy history');
    }
});

module.exports = router;
