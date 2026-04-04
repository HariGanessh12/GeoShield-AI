const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { sendSuccess, sendError } = require('../utils/http');
const { createValidator, validators } = require('../utils/validation');

const JWT_SECRET = process.env.JWT_SECRET || 'geoshield_super_secret_key_2026';

// Seed default admin
const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: 'admin@gmail.com' });
        if (!adminExists) {
            await User.create({ email: 'admin@gmail.com', password: 'password', role: 'admin' });
            console.log("Default admin created: admin@gmail.com");
        }
    } catch (e) {
        console.error("DB wait for seed");
    }
};
// Exec
setTimeout(seedAdmin, 3000);

router.post('/register', createValidator([
    { source: 'body', field: 'email', check: validators.nonEmptyString('email') },
    { source: 'body', field: 'password', check: validators.nonEmptyString('password') }
]), async (req, res) => {
    const { email, password, persona, zone } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return sendError(res, 400, "Email already exists");
        
        const user = await User.create({ 
            email, 
            password, 
            role: 'worker', 
            persona: persona || 'Food Delivery', 
            zone: zone || 'Delhi NCR', 
            reputationScore: 85 
        });
        return sendSuccess(res, {
            message: "Registered successfully",
            user: { email: user.email, role: user.role, persona: user.persona, zone: user.zone }
        });
    } catch (e) {
        return sendError(res, 500, "Registration failed");
    }
});

router.post('/login', createValidator([
    { source: 'body', field: 'email', check: validators.nonEmptyString('email') },
    { source: 'body', field: 'password', check: validators.nonEmptyString('password') }
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email, password });
        if (!user) {
            return sendError(res, 401, "Invalid email or password.");
        }

        const payload = {
            id: user._id,
            email: user.email,
            role: user.role,
            persona: user.persona,
            zone: user.zone
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        return sendSuccess(res, { token, user: payload });
    } catch (error) {
        console.error("Login Route Error:", error);
        return sendError(res, 500, "Internal Server Error or DB Timeout.");
    }
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
