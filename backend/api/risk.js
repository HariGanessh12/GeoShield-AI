const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../utils/http');

router.get('/zone-risk', (req, res) => {
    // Return mock heatmap data for admin dashboard
    return sendSuccess(res, {
        zones: [
            { lat: 28.7041, lng: 77.1025, risk_level: "HIGH", reason: "Severe Heatwave" },
            { lat: 19.0760, lng: 72.8777, risk_level: "MEDIUM", reason: "Heavy Rain" }
        ]
    });
});

router.post('/premium-breakdown', async (req, res) => {
    console.log("[Backend] Received request for /premium-breakdown");
    const { weather, traffic, location, persona_type } = req.body || {};

    try {
        console.log("[Backend] Attempting to reach ML microservice at port 8001...");
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
        console.log("[Backend] ML microservice response received.");
        return sendSuccess(res, premiumData);
    } catch(err) {
        console.error("[Backend] FastAPI connection failed, using local fallback. Error:", err.message);
        
        try {
            // Mock fallback logic mirroring the ai-engine/risk_model.py implementation
            const weather_val = Number(weather) || 50;
            const traffic_val = Number(traffic) || 50;
            const location_val = Number(location) || 50;
            const persona = persona_type || "FOOD_DELIVERY";

            let persona_multiplier = 1.0;
            if (persona === "GROCERY_DELIVERY") persona_multiplier = 1.2;
            else if (persona === "BIKE_TAXI") persona_multiplier = 1.5;

            // Actuarial logic from the Python model
            const base_probability = Math.min(Math.max((weather_val * 0.4 + location_val * 0.3 + traffic_val * 0.2) / 100.0, 0.01), 0.30);
            const adjusted_probability = base_probability * persona_multiplier;

            const expected_loss = adjusted_probability * 1000.0;
            const risk_margin = expected_loss * 0.30;
            const weekly_premium = Math.min(Math.max(expected_loss + risk_margin + 15.0, 50.0), 300.0);

            const risk_score = (adjusted_probability / 0.30) * 100;
            let risk_level = "LOW";
            if (risk_score > 60) risk_level = "HIGH";
            else if (risk_score > 30) risk_level = "MEDIUM";

            const payload = {
                risk_level,
                risk_score: Math.round(risk_score * 100) / 100,
                weekly_premium_inr: Math.round(weekly_premium * 100) / 100,
                expected_loss: Math.round(expected_loss * 100) / 100,
                risk_margin: Math.round(risk_margin * 100) / 100,
                breakdown: {
                    "Expected Loss (Probability x Payout)": `₹${Math.round(expected_loss * 100) / 100}`,
                    "Risk Margin (30%)": `₹${Math.round(risk_margin * 100) / 100}`,
                    "Platform Fee": "₹15.0",
                    "Persona Multiplier Applied": `${persona_multiplier}x (${persona})`
                },
                is_mock: true
            };
            console.log("[Backend] Local fallback payload generated.");
            return sendSuccess(res, payload);
        } catch (innerErr) {
            console.error("[Backend] CRITICAL: Fallback logic failed:", innerErr.message);
            return sendError(res, 500, "Internal server error in risk assessment fallback.");
        }
    }
});

module.exports = router;
