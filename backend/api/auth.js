const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

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

router.post('/register', async (req, res) => {
    const { email, password, persona, zone } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: "Email already exists" });
        
        const user = await User.create({ 
            email, 
            password, 
            role: 'worker', 
            persona: persona || 'Food Delivery', 
            zone: zone || 'Delhi NCR', 
            reputationScore: 85 
        });
        res.json({ message: "Registered successfully", user: { email: user.email, role: user.role, persona: user.persona, zone: user.zone } });
    } catch (e) {
        res.status(500).json({ error: "Registration failed" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const payload = {
            id: user._id,
            email: user.email,
            role: user.role,
            persona: user.persona,
            zone: user.zone
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: payload });
    } catch (error) {
        console.error("Login Route Error:", error);
        res.status(500).json({ error: "Internal Server Error or DB Timeout." });
    }
});

// Admin User Management endpoints
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: "Could not fetch users" });
    }
});

router.put('/users/:id/role', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        await User.findByIdAndUpdate(req.params.id, { role });
        res.json({ success: true, message: "Role updated" });
    } catch (e) {
        res.status(500).json({ error: "Could not update user" });
    }
});

router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "User deleted" });
    } catch (e) {
        res.status(500).json({ error: "Could not delete user" });
    }
});


module.exports = router;
