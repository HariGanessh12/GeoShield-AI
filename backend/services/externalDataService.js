const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'demo_key'; // Replace with real key
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Zone coordinates (approximate centers)
const zoneCoordinates = {
    'Delhi NCR': { lat: 28.6139, lon: 77.2090 },
    'Mumbai South': { lat: 19.0760, lon: 72.8777 },
    'Bangalore Central': { lat: 12.9716, lon: 77.5946 }
};

async function getWeatherData(lat, lon, zone) {
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
        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const rain = data.rain ? data.rain['1h'] || 0 : 0;
        const windSpeed = data.wind.speed;

        // Calculate severity scores based on real data
        let severityScore = 0;
        let eventType = 'NORMAL';

        // Heatwave: temp > 40°C
        if (temp > 40) {
            severityScore = Math.min(1.0, (temp - 40) / 10 + 0.8);
            eventType = 'HEATWAVE';
        }
        // Heavy Rain: > 10mm/hr
        else if (rain > 10) {
            severityScore = Math.min(1.0, rain / 50 + 0.7);
            eventType = 'HEAVY_RAIN';
        }
        // Traffic Surge: high wind or humidity indicating poor conditions
        else if (windSpeed > 15 || humidity > 90) {
            severityScore = Math.min(1.0, (windSpeed / 30 + humidity / 100) / 2 + 0.5);
            eventType = 'TRAFFIC_SURGE';
        }

        return {
            eventType,
            severityScore,
            baseProbability: severityScore * 0.2, // Conservative probability
            realData: {
                temperature: temp,
                humidity,
                rain,
                windSpeed,
                source: 'OpenWeatherMap'
            }
        };
    } catch (error) {
        console.error('Weather API error:', error.message);
        // Fallback to enhanced mock
        return getMockData('NORMAL', zone);
    }
}

function getMockData(eventType, geoZone) {
    // Enhanced mock with more variance
    const mockResponses = {
        'HEAVY_RAIN': { severityScore: 0.85, baseProbability: 0.15 },
        'HEATWAVE': { severityScore: 0.92, baseProbability: 0.20 },
        'PLATFORM_OUTAGE': { severityScore: 0.88, baseProbability: 0.05 },
        'AQI_SEVERE': { severityScore: 0.95, baseProbability: 0.30 },
        'TRAFFIC_SURGE': { severityScore: 0.7, baseProbability: 0.18 }
    };

    const data = mockResponses[eventType] || { severityScore: 0.5, baseProbability: 0.1 };

    // Add zone-specific variance
    let zoneVariance = 0;
    if (geoZone === 'Delhi NCR' && eventType === 'HEATWAVE') zoneVariance = 0.05;
    if (geoZone === 'Delhi NCR' && eventType === 'AQI_SEVERE') zoneVariance = 0.08;
    if (geoZone === 'Mumbai South' && eventType === 'HEAVY_RAIN') zoneVariance = 0.06;
    if (geoZone === 'Bangalore Central' && eventType === 'TRAFFIC_SURGE') zoneVariance = 0.04;

    return {
        eventType,
        geoZone,
        severityScore: Math.min(1.0, data.severityScore + zoneVariance + (Math.random() - 0.5) * 0.1),
        baseProbability: data.baseProbability,
        realData: null
    };
}

async function getExternalData(eventType, geoZone) {
    // For weather-related events, try real API
    if (['HEAVY_RAIN', 'HEATWAVE', 'TRAFFIC_SURGE'].includes(eventType)) {
        const coords = zoneCoordinates[geoZone] || zoneCoordinates['Delhi NCR'];
        const weatherData = await getWeatherData(coords.lat, coords.lon, geoZone);

        // Override eventType if weather indicates different condition
        if (weatherData.eventType !== 'NORMAL') {
            return {
                ...weatherData,
                geoZone,
                requestedEvent: eventType
            };
        }
    }

    // Fallback to mock for non-weather events or if API fails
    return getMockData(eventType, geoZone);
}

module.exports = { getExternalData };
