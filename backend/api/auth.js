const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/http');
const { createValidator, validators } = require('../utils/validation');
const { comparePassword } = require('../services/passwordService');
const { createAuthToken, setAuthCookie, clearAuthCookie } = require('../services/sessionService');
const { logInfo, logWarn, logError } = require('../utils/logger');
const PERSONA_TYPES = ['FOOD_DELIVERY', 'GROCERY_DELIVERY', 'BIKE_TAXI'];
const ZONES = ['Delhi NCR', 'Mumbai South', 'Bangalore Central', 'N/A'];

function normalizePersonaType(value) {
    const raw = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (PERSONA_TYPES.includes(raw)) return raw;

    const aliasMap = {
        FOOD_DELIVERY: 'FOOD_DELIVERY',
        GROCERY_Q_COMMERCE: 'GROCERY_DELIVERY',
        GROCERY_DELIVERY: 'GROCERY_DELIVERY',
        E_COMMERCE: 'BIKE_TAXI',
        BIKE_TAXI: 'BIKE_TAXI'
    };

    return aliasMap[raw] || 'FOOD_DELIVERY';
}

router.post('/register', createValidator([
    { source: 'body', field: 'email', check: validators.email('email') },
    { source: 'body', field: 'password', check: validators.password('password', 8) },
    { source: 'body', field: 'zone', check: validators.enumValue('zone', ZONES, { optional: true }) }
]), async (req, res) => {
    const { email, password, persona, personaType, zone } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return sendError(res, 400, "Email already exists");

        const normalizedPersonaType = normalizePersonaType(personaType || persona);

        const user = await User.create({ 
            email, 
            password, 
            role: 'worker', 
            personaType: normalizedPersonaType,
            zone: zone || 'Delhi NCR', 
            reputationScore: 85 
        });
        logInfo('auth.registered', { userId: String(user._id), email: user.email, role: user.role });
        return sendSuccess(res, {
            message: "Registered successfully",
            user: { id: String(user._id), email: user.email, role: user.role, personaType: user.personaType, zone: user.zone }
        });
    } catch (e) {
        logError('auth.register_failed', e, { email });
        return sendError(res, 500, "Registration failed");
    }
});

router.post('/login', createValidator([
    { source: 'body', field: 'email', check: validators.email('email') },
    { source: 'body', field: 'password', check: validators.nonEmptyString('password') }
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        const isValid = await comparePassword(password, user?.password);
        if (!user || !isValid) {
            logWarn('auth.login_failed', { email });
            return sendError(res, 401, "Invalid email or password.");
        }

        if (user.password && !String(user.password).startsWith('$2')) {
            user.password = password;
            await user.save();
        }

        const payload = {
            id: user._id,
            email: user.email,
            role: user.role,
            personaType: user.personaType,
            zone: user.zone
        };

        const token = createAuthToken(payload);
        setAuthCookie(res, token);
        logInfo('auth.login_success', { userId: String(user._id), email: user.email, role: user.role });

        return sendSuccess(res, { user: payload, session: { transport: 'httpOnlyCookie' } });
    } catch (error) {
        logError('auth.login_error', error, { email: req.body?.email });
        return sendError(res, 500, "Internal Server Error or DB Timeout.");
    }
});

router.post('/logout', async (req, res) => {
    clearAuthCookie(res);
    return sendSuccess(res, { message: 'Logged out' });
});

router.get('/session', verifyToken, async (req, res) => {
    return sendSuccess(res, { user: req.user });
});

// Admin User Management endpoints
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        return sendSuccess(res, users);
    } catch (e) {
        return sendError(res, 500, "Could not fetch users");
    }
});

router.put('/users/:id/role', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        await User.findByIdAndUpdate(req.params.id, { role });
        return sendSuccess(res, { message: "Role updated" });
    } catch (e) {
        return sendError(res, 500, "Could not update user");
    }
});

router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        return sendSuccess(res, { message: "User deleted" });
    } catch (e) {
        return sendError(res, 500, "Could not delete user");
    }
});


module.exports = router;
