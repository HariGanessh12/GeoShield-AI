const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
    // Mock login handler
    res.json({ token: "mock_jwt_token_123", user: { id: "u101", name: "Rahul Delivery", role: "worker" } });
});

module.exports = router;
