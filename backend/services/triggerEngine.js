const { getExternalData } = require('./externalDataService');

const SUPPORTED_TRIGGERS = ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE', 'AQI_SEVERE', 'TRAFFIC_SURGE'];

const triggerMetadata = {
    HEAVY_RAIN: { label: 'Heavy Rain', threshold: 0.55, baseLossAmount: 550 },
    HEATWAVE: { label: 'Heatwave', threshold: 0.6, baseLossAmount: 450 },
    PLATFORM_OUTAGE: { label: 'Platform Outage', threshold: 0.45, baseLossAmount: 400 },
    AQI_SEVERE: { label: 'Severe Air Quality', threshold: 0.65, baseLossAmount: 500 },
    TRAFFIC_SURGE: { label: 'Traffic Surge', threshold: 0.58, baseLossAmount: 350 }
};

function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

async function detectTrigger(type, zone) {
    const metadata = triggerMetadata[type];
    if (!metadata) return null;

    const externalData = await getExternalData(type, zone);
    const severityScore = Number(externalData?.severityScore || 0);
    return {
        type,
        label: metadata.label,
        severityScore,
        threshold: metadata.threshold,
        eligible: severityScore >= metadata.threshold,
        lossAmount: round2(metadata.baseLossAmount * (0.9 + severityScore / 2)),
        reason: `${metadata.label} detected for ${zone || 'the worker zone'}`,
        dataSource: externalData?.source || 'Unknown',
        reliability: externalData?.reliability || 'fallback',
        lastUpdated: externalData?.lastUpdated || null
    };
}

async function buildTriggerFeed(zone) {
    const feed = await Promise.all(SUPPORTED_TRIGGERS.map((type) => detectTrigger(type, zone)));
    return feed.filter(Boolean).sort((a, b) => b.severityScore - a.severityScore);
}

function getPolicyEventCoverage(policy) {
    return Array.isArray(policy?.coveredEvents) && policy.coveredEvents.length > 0
        ? policy.coveredEvents
        : ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE'];
}

function evaluateTriggerEligibility(feed, policy, shiftState) {
    const coveredEvents = getPolicyEventCoverage(policy);
    return feed.map((item) => ({
        ...item,
        coveredByPolicy: coveredEvents.includes(item.type),
        shiftActive: shiftState === 'ON',
        canAutoClaim: Boolean(policy) && shiftState === 'ON' && coveredEvents.includes(item.type) && item.eligible
    }));
}

function selectRecommendedTrigger(feed) {
    return feed.find((item) => item.canAutoClaim) || null;
}

module.exports = {
    SUPPORTED_TRIGGERS,
    buildTriggerFeed,
    evaluateTriggerEligibility,
    getPolicyEventCoverage,
    selectRecommendedTrigger
};
