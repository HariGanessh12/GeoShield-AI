async function getExternalData(eventType, geoZone) {
    // Mock external API call (e.g., IMD Weather, Google Maps API)
    // This is where real integrations would fetch live severities
    const mockResponses = {
        'HEAVY_RAIN': { severityScore: 0.85, baseProbability: 0.15 },
        'HEATWAVE': { severityScore: 0.92, baseProbability: 0.20 },
        'PLATFORM_OUTAGE': { severityScore: 0.88, baseProbability: 0.05 },
        'AQI_SEVERE': { severityScore: 0.95, baseProbability: 0.30 }
    };

    const data = mockResponses[eventType] || { severityScore: 0.5, baseProbability: 0.1 };
    
    // Add minor variance based on zone to simulate real geofenced data
    let zoneVariance = 0;
    if (geoZone === 'Delhi NCR' && eventType === 'HEATWAVE') zoneVariance = 0.05;
    if (geoZone === 'Delhi NCR' && eventType === 'AQI_SEVERE') zoneVariance = 0.08;
    if (geoZone === 'Mumbai South' && eventType === 'HEAVY_RAIN') zoneVariance = 0.06;

    return {
        eventType,
        geoZone,
        severityScore: Math.min(1.0, data.severityScore + zoneVariance),
        baseProbability: data.baseProbability
    };
}

module.exports = { getExternalData };
