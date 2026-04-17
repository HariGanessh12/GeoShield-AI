const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../utils/http');
const externalDataService = require('../services/externalDataService');
const { calculatePremium } = require('../services/pricingEngine');

const ZONES = ['Delhi NCR', 'Mumbai South', 'Bangalore Central'];
const EVENTS = ['HEATWAVE', 'HEAVY_RAIN', 'AQI_SEVERE'];

function mapSeverityToRiskLevel(score) {
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.45) return 'MEDIUM';
    return 'LOW';
}

router.get('/zone-risk', async (req, res) => {
    try {
        const zones = await Promise.all(ZONES.map(async (zone) => {
            const summary = await externalDataService.getZoneRiskSummary(zone);
            const averageSeverity = summary.severityScore;
            return {
                zone,
                risk_level: mapSeverityToRiskLevel(averageSeverity),
                severity_score: Number(averageSeverity.toFixed(2)),
                reason: summary.dominantSignal?.eventType || 'NORMAL',
                data_label: summary.reliability === 'real' ? 'Live data' : summary.reliability === 'mixed' ? 'Mixed live/fallback data' : 'Simulated data (fallback)',
                source: summary.source,
                last_updated: summary.last_updated,
                reliability: summary.reliability,
                signals: summary.signals.map((signal) => ({
                    category: signal.category,
                    source: signal.source,
                    reliability: signal.reliability,
                    last_updated: signal.lastUpdated,
                    severity_score: signal.severityScore
                }))
            };
        }));

        return sendSuccess(res, { zones });
    } catch (error) {
        return sendError(res, 500, 'Could not compute zone risk');
    }
});

router.get('/weather-metadata', async (req, res) => {
    try {
        const zone = req.user?.zone || 'Delhi NCR';
        const coords = externalDataService.zoneCoordinates[zone] || externalDataService.zoneCoordinates['Delhi NCR'];
        const weatherData = await externalDataService.getWeatherSignal(zone, 'HEATWAVE');
        return sendSuccess(res, weatherData.metadata);
    } catch (error) {
        return sendSuccess(res, {
            source_name: 'Simulated data (fallback)',
            last_updated_timestamp: new Date().toISOString(),
            location: req.user?.zone || 'Unknown',
            reliability_flag: 'fallback'
        });
    }
});

router.post('/premium-breakdown', async (req, res) => {
    try {
        const payload = calculatePremium({
            weather: req.body?.weather || 50,
            traffic: req.body?.traffic || 50,
            location: req.body?.location || 50,
            persona_type: req.body?.persona_type || req.user?.personaType || 'FOOD_DELIVERY',
            reputation_score: req.body?.reputation_score || 85,
            zone: req.user?.zone || 'Delhi NCR',
            claim_history: []
        });

        return sendSuccess(res, {
            ...payload,
            data_label: 'Live pricing engine'
        });
    } catch (error) {
        return sendError(res, 500, 'Internal server error in risk assessment.');
    }
});

module.exports = router;
