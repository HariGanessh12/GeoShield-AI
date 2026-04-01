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

router.post('/premium-breakdown', async (req, res) => {
    // New endpoint matching Actuarial requirements via FastAPI
    const { weather, traffic, location, persona_type } = req.body;

    try {
        const response = await fetch("http://localhost:8001/risk-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                weather: weather || 50,
                traffic: traffic || 50,
                location: location || 50,
                persona_type: persona_type || "FOOD_DELIVERY"
            })
        });

        if (!response.ok) {
            throw new Error(`FastAPI Risk Model Error: ${response.statusText}`);
        }
        
        const premiumData = await response.json();
        res.json(premiumData);
    } catch(err) {
        console.error("FastAPI connection error:", err);
        res.status(500).json({ error: "Failed to calculate premium via ML microservice." });
    }
});

module.exports = router;
