const axios = require('axios');

// Configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_ENABLED = Boolean(OPENWEATHER_API_KEY);

// Zone coordinates (approximate centers)
const zoneCoordinates = {
    'Delhi NCR': { lat: 28.6139, lon: 77.2090 },
    'Mumbai South': { lat: 19.0760, lon: 72.8777 },
    'Bangalore Central': { lat: 12.9716, lon: 77.5946 },
    'N/A': { lat: 28.7041, lon: 77.1025 }
};

/**
 * Fetch weather data from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} zone - Geographic zone name
 * @param {string} eventType - Type of event being queried
 * @returns {Promise<Object>} Weather data or fallback mock data
 */
async function getWeatherData(lat, lon, zone, eventType) {
    // If API key not configured, skip API call and use mock
    if (!OPENWEATHER_ENABLED) {
        console.warn('[ExternalData] Weather API disabled: OPENWEATHER_API_KEY not set');
        return getMockData(eventType, zone);
    }

    try {
        const response = await axios.get(OPENWEATHER_BASE_URL, {
            params: {
                lat,
                lon,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            },
            timeout: 5000
        });

        const data = response.data;
        if (!data.main || !data.wind) {
            console.warn('[ExternalData] Invalid weather data response:', data);
            return getMockData(eventType, zone);
        }

        const temp = data.main.temp || 0;
        const humidity = data.main.humidity || 0;
        const rain = (data.rain && data.rain['1h']) || 0;
        const windSpeed = (data.wind && data.wind.speed) || 0;

        // Calculate severity scores based on real data
        let severityScore = 0;
        let detectedEventType = 'NORMAL';

        // Heatwave: temp > 40°C
        if (temp > 40) {
            severityScore = Math.min(1.0, (temp - 40) / 10 + 0.8);
            detectedEventType = 'HEATWAVE';
        }
        // Heavy Rain: > 10mm/hr
        else if (rain > 10) {
            severityScore = Math.min(1.0, rain / 50 + 0.7);
            detectedEventType = 'HEAVY_RAIN';
        }
        // Traffic Surge: high wind or humidity indicating poor conditions
        else if (windSpeed > 15 || humidity > 90) {
            severityScore = Math.min(1.0, (windSpeed / 30 + humidity / 100) / 2 + 0.5);
            detectedEventType = 'TRAFFIC_SURGE';
        }

        console.info(`[ExternalData] Weather API success (${zone}):`, {
            temp,
            rain,
            wind: windSpeed,
            detectedEventType,
            severityScore
        });

        return {
            eventType: detectedEventType,
            severityScore,
            baseProbability: severityScore * 0.2,
            realData: {
                temperature: temp,
                humidity,
                rain,
                windSpeed,
                source: 'OpenWeatherMap',
                zone,
                timestamp: new Date().toISOString()
            },
            apiUsed: true
        };
    } catch (error) {
        const errorCode = error.response?.status || error.code || 'UNKNOWN';
        const errorMsg = error.message || 'Unknown error';
        
        console.warn(`[ExternalData] Weather API failed (${errorCode}): ${errorMsg}`, {
            zone,
            eventType,
            requestedEvent: eventType
        });

        // Fallback to mock data with a safe signature
        return getMockData(eventType, zone);
    }
}

/**
 * Generate enhanced mock data for disruption events
 * @param {string} eventType - Type of event (HEAVY_RAIN, HEATWAVE, etc.)
 * @param {string} geoZone - Geographic zone
 * @returns {Object} Mock event data with realistic severity
 */
function getMockData(eventType = 'NORMAL', geoZone = 'Delhi NCR') {
    // Enhanced mock responses with realistic severity scores
    const mockResponses = {
        'HEAVY_RAIN': { severityScore: 0.75, baseProbability: 0.15, source: 'mock_rain' },
        'HEATWAVE': { severityScore: 0.82, baseProbability: 0.20, source: 'mock_heatwave' },
        'PLATFORM_OUTAGE': { severityScore: 0.78, baseProbability: 0.08, source: 'mock_outage' },
        'AQI_SEVERE': { severityScore: 0.85, baseProbability: 0.25, source: 'mock_aqi' },
        'TRAFFIC_SURGE': { severityScore: 0.65, baseProbability: 0.18, source: 'mock_traffic' },
        'NORMAL': { severityScore: 0.4, baseProbability: 0.05, source: 'mock_normal' }
    };

    const mockData = mockResponses[eventType] || mockResponses['NORMAL'];

    // Add zone-specific variance to make mock data more realistic
    let zoneVariance = 0;
    if (geoZone === 'Delhi NCR' && eventType === 'HEATWAVE') zoneVariance = 0.08;
    if (geoZone === 'Delhi NCR' && eventType === 'AQI_SEVERE') zoneVariance = 0.10;
    if (geoZone === 'Mumbai South' && eventType === 'HEAVY_RAIN') zoneVariance = 0.12;
    if (geoZone === 'Bangalore Central' && eventType === 'TRAFFIC_SURGE') zoneVariance = 0.06;

    const finalSeverityScore = Math.min(
        1.0,
        mockData.severityScore + zoneVariance + (Math.random() - 0.5) * 0.08
    );

    const result = {
        eventType,
        geoZone: geoZone || 'N/A',
        severityScore: Math.max(0, Math.min(1.0, finalSeverityScore)),
        baseProbability: mockData.baseProbability,
        realData: null,
        apiUsed: false,
        source: mockData.source,
        timestamp: new Date().toISOString()
    };

    console.info(`[ExternalData] Using mock data (${eventType}/${geoZone}):`, {
        severityScore: result.severityScore,
        source: result.source
    });

    return result;
}

/**
 * Get external disruption event data from real API or mock
 * Implements graceful fallback with no cascading failures
 * @param {string} eventType - Type of disruption event
 * @param {string} geoZone - Geographic zone
 * @returns {Promise<Object>} Event severity and metadata
 */
async function getExternalData(eventType, geoZone) {
    // Validate inputs
    if (!eventType || typeof eventType !== 'string') {
        console.warn('[ExternalData] Invalid eventType:', eventType);
        eventType = 'NORMAL';
    }

    if (!geoZone || typeof geoZone !== 'string') {
        geoZone = 'Delhi NCR';
    }

    try {
        // For weather-related events, attempt to fetch real data
        if (['HEAVY_RAIN', 'HEATWAVE', 'TRAFFIC_SURGE'].includes(eventType)) {
            const coords = zoneCoordinates[geoZone] || zoneCoordinates['Delhi NCR'];
            
            const weatherData = await getWeatherData(coords.lat, coords.lon, geoZone, eventType);

            // Return real data if available
            if (weatherData && weatherData.apiUsed) {
                return {
                    ...weatherData,
                    geoZone,
                    requestedEvent: eventType
                };
            }
        }

        // For other event types or if weather API failed, use mock
        return getMockData(eventType, geoZone);
    } catch (err) {
        console.error('[ExternalData] Unexpected error in getExternalData:', {
            error: err.message,
            eventType,
            geoZone
        });

        // Always fallback to safe mock data - never throw
        return getMockData(eventType, geoZone);
    }
}

module.exports = { getExternalData };
