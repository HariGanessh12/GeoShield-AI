const express = require('express');
const router = express.Router();

router.get('/zone-risk', (req, res) => {
    // Return mock heatmap data for admin dashboard
    res.json({
        zones: [
            { lat: 28.7041, lng: 77.1025, risk_level: "HIGH", reason: "Severe Heatwave" },
            { lat: 19.0760, lng: 72.8777, risk_level: "MEDIUM", reason: "Heavy Rain" }
        ]
    });
});

module.exports = router;
