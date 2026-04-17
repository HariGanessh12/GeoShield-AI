const axios = require('axios');
const config = require('../config');
const { logWarn, logError, logInfo } = require('../utils/logger');

const zoneCoordinates = {
    'Delhi NCR': { lat: 28.6139, lon: 77.2090 },
    'Mumbai South': { lat: 19.0760, lon: 72.8777 },
    'Bangalore Central': { lat: 12.9716, lon: 77.5946 },
    'N/A': { lat: 28.6139, lon: 77.2090 }
};

const providerCatalog = {
    weather: { provider: 'OpenWeatherMap', reliability: 'real' },
    aqi: { provider: 'OpenWeather Air Pollution', reliability: 'real' },
    traffic: { provider: 'Simulated', reliability: 'fallback' },
    outage: { provider: 'Simulated', reliability: 'fallback' },
    zone_risk: { provider: 'GeoShield Zone Risk Engine', reliability: 'mixed' }
};

function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, Number(value || 0)));
}

function resolveZone(zone) {
    return zoneCoordinates[zone] ? zone : 'Delhi NCR';
}

function buildStandardMeta({ category, provider, reliability, zone, fallbackReason = null }) {
    return {
        category,
        source: provider,
        provider,
        reliability,
        last_updated: new Date().toISOString(),
        fallbackReason,
        zone
    };
}

function buildResponse({
    category,
    eventType,
    geoZone,
    severityScore,
    baseProbability,
    source,
    reliability,
    realData = null,
    fallbackReason = null,
    details = {}
}) {
    const meta = buildStandardMeta({
        category,
        provider: source,
        reliability,
        zone: geoZone,
        fallbackReason
    });

    return {
        category,
        eventType,
        geoZone,
        severityScore: clamp(severityScore),
        baseProbability: clamp(baseProbability),
        source,
        reliability,
        apiUsed: reliability === 'real',
        realData,
        lastUpdated: meta.last_updated,
        metadata: {
            source_name: source,
            last_updated_timestamp: meta.last_updated,
            reliability_flag: reliability,
            fallback_reason: fallbackReason,
            location: geoZone,
            category
        },
        details
    };
}

function buildFallbackData(eventType = 'NORMAL', zone = 'Delhi NCR', category = 'generic', reason = 'api_unavailable') {
    const fallbackScores = {
        HEAVY_RAIN: 0.62,
        HEATWAVE: 0.66,
        PLATFORM_OUTAGE: 0.58,
        AQI_SEVERE: 0.71,
        TRAFFIC_SURGE: 0.55,
        NORMAL: 0.3
    };

    const provider = providerCatalog[category]?.provider || 'Simulated';
    const reliability = providerCatalog[category]?.reliability || 'fallback';

    return buildResponse({
        category,
        eventType,
        geoZone: zone,
        severityScore: fallbackScores[eventType] || fallbackScores.NORMAL,
        baseProbability: clamp((fallbackScores[eventType] || 0.3) * 0.2),
        source: provider,
        reliability,
        fallbackReason: reason,
        details: {
            mode: 'Simulated (Fallback)'
        }
    });
}

function severityFromWeather(eventType, weather) {
    const temp = Number(weather.main?.temp || 0);
    const humidity = Number(weather.main?.humidity || 0);
    const rain = Number(weather.rain?.['1h'] || 0);
    const windSpeed = Number(weather.wind?.speed || 0);

    const map = {
        HEATWAVE: clamp((temp - 36) / 10),
        HEAVY_RAIN: clamp(rain / 20),
        TRAFFIC_SURGE: clamp((windSpeed / 20) * 0.5 + (humidity / 100) * 0.5),
        AQI_SEVERE: clamp((humidity / 100) * 0.35 + (temp > 35 ? 0.25 : 0.05)),
        PLATFORM_OUTAGE: 0.35
    };

    return clamp(map[eventType] ?? 0.3);
}

function severityFromAqi(aqiIndex, components = {}) {
    const pm25 = Number(components.pm2_5 || 0);
    const pm10 = Number(components.pm10 || 0);
    return clamp(((aqiIndex / 5) * 0.55) + clamp(pm25 / 120) * 0.3 + clamp(pm10 / 180) * 0.15);
}

async function fetchOpenWeatherCurrent(lat, lon) {
    return axios.get(config.weatherApiBaseUrl, {
        params: {
            lat,
            lon,
            appid: config.weatherApiKey,
            units: 'metric'
        },
        timeout: 5000
    });
}

async function fetchOpenWeatherAqi(lat, lon) {
    return axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
        params: {
            lat,
            lon,
            appid: config.weatherApiKey
        },
        timeout: 5000
    });
}

async function getWeatherSignal(zone, eventType) {
    const geoZone = resolveZone(zone);
    if (!config.weatherApiKey) {
        logWarn('external.weather.no_api_key', { geoZone, eventType });
        return buildFallbackData(eventType, geoZone, 'weather', 'missing_openweather_api_key');
    }

    try {
        const coords = zoneCoordinates[geoZone];
        const response = await fetchOpenWeatherCurrent(coords.lat, coords.lon);
        const severityScore = severityFromWeather(eventType, response.data);
        const payload = buildResponse({
            category: 'weather',
            eventType,
            geoZone,
            severityScore,
            baseProbability: clamp(severityScore * 0.2),
            source: providerCatalog.weather.provider,
            reliability: providerCatalog.weather.reliability,
            realData: {
                temperature: response.data.main?.temp ?? null,
                humidity: response.data.main?.humidity ?? null,
                rain: response.data.rain?.['1h'] ?? 0,
                windSpeed: response.data.wind?.speed ?? null,
                conditions: response.data.weather?.[0]?.description ?? null
            }
        });
        logInfo('external.weather.success', { geoZone, eventType, severityScore });
        return payload;
    } catch (error) {
        logWarn('external.weather.failed', { geoZone, eventType, message: error.message });
        return buildFallbackData(eventType, geoZone, 'weather', error.message);
    }
}

async function getAqiSignal(zone) {
    const geoZone = resolveZone(zone);
    if (!config.weatherApiKey) {
        return buildFallbackData('AQI_SEVERE', geoZone, 'aqi', 'missing_openweather_api_key');
    }

    try {
        const coords = zoneCoordinates[geoZone];
        const response = await fetchOpenWeatherAqi(coords.lat, coords.lon);
        const reading = response.data?.list?.[0] || {};
        const severityScore = severityFromAqi(Number(reading.main?.aqi || 0), reading.components || {});
        const payload = buildResponse({
            category: 'aqi',
            eventType: 'AQI_SEVERE',
            geoZone,
            severityScore,
            baseProbability: clamp(severityScore * 0.22),
            source: providerCatalog.aqi.provider,
            reliability: providerCatalog.aqi.reliability,
            realData: {
                aqiIndex: reading.main?.aqi ?? null,
                components: reading.components || {}
            }
        });
        logInfo('external.aqi.success', { geoZone, severityScore });
        return payload;
    } catch (error) {
        logWarn('external.aqi.failed', { geoZone, message: error.message });
        return buildFallbackData('AQI_SEVERE', geoZone, 'aqi', error.message);
    }
}

async function getTrafficSignal(zone) {
    const geoZone = resolveZone(zone);
    const baseScore = {
        'Delhi NCR': 0.74,
        'Mumbai South': 0.68,
        'Bangalore Central': 0.63
    }[geoZone] || 0.55;

    return buildResponse({
        category: 'traffic',
        eventType: 'TRAFFIC_SURGE',
        geoZone,
        severityScore: baseScore,
        baseProbability: clamp(baseScore * 0.18),
        source: providerCatalog.traffic.provider,
        reliability: providerCatalog.traffic.reliability,
        fallbackReason: 'traffic_provider_not_configured',
        details: {
            mode: 'Simulated (Fallback)',
            plug_in_ready_for: 'TomTom / Google Maps / Mapbox Traffic'
        }
    });
}

async function getPlatformOutageSignal(zone) {
    const geoZone = resolveZone(zone);
    return buildResponse({
        category: 'outage',
        eventType: 'PLATFORM_OUTAGE',
        geoZone,
        severityScore: 0.58,
        baseProbability: 0.08,
        source: providerCatalog.outage.provider,
        reliability: providerCatalog.outage.reliability,
        fallbackReason: 'status_provider_not_configured',
        details: {
            mode: 'Simulated (Fallback)',
            plug_in_ready_for: 'Statuspage / Better Stack / UptimeRobot'
        }
    });
}

async function getExternalData(eventType, geoZone) {
    const zone = resolveZone(geoZone);

    try {
        if (eventType === 'AQI_SEVERE') return await getAqiSignal(zone);
        if (eventType === 'PLATFORM_OUTAGE') return await getPlatformOutageSignal(zone);
        if (eventType === 'TRAFFIC_SURGE') return await getTrafficSignal(zone);
        if (['HEAVY_RAIN', 'HEATWAVE'].includes(eventType)) return await getWeatherSignal(zone, eventType);
        return buildFallbackData(eventType, zone, 'generic', 'unsupported_event');
    } catch (error) {
        logError('external.data.failed', error, { zone, eventType });
        return buildFallbackData(eventType, zone, 'generic', error.message);
    }
}

async function getZoneRiskSummary(zone) {
    const geoZone = resolveZone(zone);
    const [weatherHeat, weatherRain, aqi, traffic, outage] = await Promise.all([
        getWeatherSignal(geoZone, 'HEATWAVE'),
        getWeatherSignal(geoZone, 'HEAVY_RAIN'),
        getAqiSignal(geoZone),
        getTrafficSignal(geoZone),
        getPlatformOutageSignal(geoZone)
    ]);

    const signals = [weatherHeat, weatherRain, aqi, traffic, outage];
    const averageSeverity = signals.reduce((sum, item) => sum + Number(item.severityScore || 0), 0) / signals.length;
    const dominantSignal = [...signals].sort((a, b) => Number(b.severityScore || 0) - Number(a.severityScore || 0))[0];
    const reliability = signals.every((item) => item.reliability === 'real')
        ? 'real'
        : signals.some((item) => item.reliability === 'real')
            ? 'mixed'
            : 'fallback';

    return {
        zone: geoZone,
        severityScore: clamp(averageSeverity),
        source: providerCatalog.zone_risk.provider,
        reliability,
        last_updated: new Date().toISOString(),
        dominantSignal,
        signals
    };
}

module.exports = {
    getExternalData,
    getWeatherSignal,
    getAqiSignal,
    getTrafficSignal,
    getPlatformOutageSignal,
    getZoneRiskSummary,
    buildFallbackData,
    zoneCoordinates
};
