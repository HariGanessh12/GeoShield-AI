const config = require('../config');
const { logWarn } = require('../utils/logger');

function round(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function buildClaimPayload(claim, userProfile = {}) {
    const claimHistory = Array.isArray(userProfile.claims_history) ? userProfile.claims_history : [];
    const recentClaims = Array.isArray(userProfile.recentClaims) ? userProfile.recentClaims : [];
    const deviceId = claim.deviceInfo?.deviceId;
    const ipAddress = claim.deviceInfo?.ipAddress;
    const zone = claim.location?.zone || userProfile.zone || 'N/A';

    const nodes = [
        `worker:${claim.workerId}`,
        deviceId ? `device:${deviceId}` : null,
        ipAddress ? `ip:${ipAddress}` : null,
        zone ? `zone:${zone}` : null
    ].filter(Boolean);

    const edges = [];
    if (deviceId) edges.push([`worker:${claim.workerId}`, `device:${deviceId}`]);
    if (ipAddress) edges.push([`worker:${claim.workerId}`, `ip:${ipAddress}`]);
    if (zone) edges.push([`worker:${claim.workerId}`, `zone:${zone}`]);

    for (const previous of recentClaims) {
        if (previous?.deviceInfo?.deviceId && deviceId && previous.deviceInfo.deviceId === deviceId) {
            nodes.push(`worker:${previous.workerId}`);
            edges.push([`worker:${claim.workerId}`, `worker:${previous.workerId}`]);
        }
        if (previous?.deviceInfo?.ipAddress && ipAddress && previous.deviceInfo.ipAddress === ipAddress) {
            nodes.push(`worker:${previous.workerId}`);
            edges.push([`worker:${claim.workerId}`, `worker:${previous.workerId}`]);
        }
    }

    return {
        history: claimHistory.map((entry) => Number(entry.amount ?? entry)).filter(Number.isFinite),
        current: Number(claim.amount || 0),
        nodes: [...new Set(nodes)],
        edges
    };
}

function localFraudAnalysis(history, currentAmount) {
    if (!Array.isArray(history) || history.length < 2) {
        return { anomaly_score: 0, is_anomaly: false, confidence: 0.55, reason: 'insufficient_history' };
    }

    const average = history.reduce((sum, value) => sum + Number(value || 0), 0) / history.length;
    const deviation = average > 0 ? Math.abs(currentAmount - average) / average : 0;
    const isAnomaly = deviation >= 0.75 || currentAmount >= average * 2.4;

    return {
        anomaly_score: round(isAnomaly ? -deviation : 1 - deviation),
        is_anomaly: isAnomaly,
        confidence: 0.8,
        reason: isAnomaly ? 'amount_outlier' : 'normal_activity'
    };
}

function localGraphAnalysis(nodes, edges) {
    const uniqueEdges = Array.isArray(edges) ? edges : [];
    const degreeMap = new Map();

    for (const node of nodes || []) degreeMap.set(node, 0);
    for (const [a, b] of uniqueEdges) {
        degreeMap.set(a, (degreeMap.get(a) || 0) + 1);
        degreeMap.set(b, (degreeMap.get(b) || 0) + 1);
    }

    const suspiciousNodes = [...degreeMap.entries()].filter(([, degree]) => degree >= 3).map(([node]) => node);

    return {
        graph_size: degreeMap.size,
        total_edges: uniqueEdges.length,
        detected_fraud_rings: suspiciousNodes.length > 0 ? [suspiciousNodes] : [],
        ring_count: suspiciousNodes.length > 0 ? 1 : 0,
        network_risk_level: suspiciousNodes.length > 0 ? 'HIGH' : 'LOW'
    };
}

function validateClaimSignals(claim, userProfile = {}) {
    let scoreAdjustment = 0;
    const reasons = [];
    const adjustments = [];

    const location = claim.location || {};
    if (location.accuracy && location.accuracy > 150) {
        scoreAdjustment -= 10;
        reasons.push('Location accuracy is too weak for instant approval');
        adjustments.push({ factor: 'low_location_accuracy', delta: -10 });
    }

    if (location.timestamp) {
        const ageMs = Date.now() - new Date(location.timestamp).getTime();
        if (ageMs > 20 * 60 * 1000) {
            scoreAdjustment -= 10;
            reasons.push('Location proof is older than 20 minutes');
            adjustments.push({ factor: 'stale_location', delta: -10 });
        }
    }

    if (location.zone && userProfile.zone && location.zone !== userProfile.zone) {
        scoreAdjustment -= 25;
        reasons.push('Claim zone does not match the worker profile zone');
        adjustments.push({ factor: 'zone_mismatch', delta: -25 });
    }

    if (claim.manualFlags?.locationMismatch) {
        scoreAdjustment -= 35;
        reasons.push('GPS mismatch detected from submitted evidence');
        adjustments.push({ factor: 'GPS Mismatch Penalty', delta: -35 });
    }

    const recentClaimTimestamps = Array.isArray(userProfile.recentClaimTimestamps) ? userProfile.recentClaimTimestamps : [];
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const hourlyClaims = recentClaimTimestamps.filter((value) => new Date(value).getTime() >= oneHourAgo).length;
    if (hourlyClaims >= 2) {
        scoreAdjustment -= 20;
        reasons.push('Rapid repeat claims require manual review');
        adjustments.push({ factor: 'claim_velocity', delta: -20 });
    }

    if ((claim.externalData?.severityScore || 0) >= 0.8) {
        scoreAdjustment += 5;
        reasons.push('High disruption severity supports the claim');
        adjustments.push({ factor: 'severity_support', delta: 5 });
    }

    return { scoreAdjustment, reasons, adjustments };
}

function mergeDecision({ claim, userProfile, fraudAnalysis, graphAnalysis }) {
    let trustScore = 100;
    const adjustments = [];
    const reasons = [];

    if (fraudAnalysis?.is_anomaly) {
        trustScore -= 35;
        reasons.push(`Fraud model flagged claim behavior: ${fraudAnalysis.reason || 'anomaly_detected'}`);
        adjustments.push({ factor: 'fraud_model', delta: -35, confidence: fraudAnalysis.confidence || 0.5 });
    }

    if (graphAnalysis?.network_risk_level === 'HIGH') {
        trustScore -= 30;
        reasons.push('Relationship graph shows shared suspicious signals');
        adjustments.push({ factor: 'graph_risk', delta: -30, ringCount: graphAnalysis.ring_count || 0 });
    }

    const signalValidation = validateClaimSignals(claim, userProfile);
    trustScore += signalValidation.scoreAdjustment;
    reasons.push(...signalValidation.reasons);
    adjustments.push(...signalValidation.adjustments);

    const reputation = Number(userProfile.reputation || 85);
    if (reputation >= 90) {
        trustScore += 8;
        reasons.push(`High worker reputation (${reputation}) supports instant settlement`);
        adjustments.push({ factor: 'reputation_bonus', delta: 8 });
    } else if (reputation < 60) {
        trustScore -= 10;
        reasons.push(`Low worker reputation (${reputation}) requires extra scrutiny`);
        adjustments.push({ factor: 'reputation_penalty', delta: -10 });
    }

    trustScore = Math.max(0, Math.min(100, round(trustScore)));

    let status = 'REJECTED';
    if (trustScore >= 80) status = 'APPROVED';
    else if (trustScore >= 50) status = 'VERIFY';

    return {
        status,
        trustScore,
        trust_score: trustScore,
        aiConfidence: round(Math.max(fraudAnalysis?.confidence || 0.55, graphAnalysis?.ring_count ? 0.8 : 0.6)),
        fraudScore: fraudAnalysis?.anomaly_score ?? 0,
        graphRiskLevel: graphAnalysis?.network_risk_level || 'LOW',
        adjustments,
        reasons
    };
}

async function fetchJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`${url} responded with ${response.status}`);
    }

    return response.json();
}

async function runAiAnalyses(claim, userProfile = {}) {
    const payload = buildClaimPayload(claim, userProfile);
    const baseUrl = config.aiEngineBaseUrl.replace(/\/$/, '');

    try {
        const [fraudAnalysis, graphAnalysis] = await Promise.all([
            fetchJson(`${baseUrl}/fraud-detect`, {
                history: payload.history,
                current: payload.current
            }),
            fetchJson(`${baseUrl}/graph-detect`, {
                nodes: payload.nodes,
                edges: payload.edges
            })
        ]);

        return { fraudAnalysis, graphAnalysis, source: 'ai_service' };
    } catch (error) {
        logWarn('trust_score.ai_fallback', { message: error.message });
        return {
            fraudAnalysis: localFraudAnalysis(payload.history, payload.current),
            graphAnalysis: localGraphAnalysis(payload.nodes, payload.edges),
            source: 'local_fallback'
        };
    }
}

async function scoreClaim(claim, userProfile = {}) {
    const analyses = await runAiAnalyses(claim, userProfile);
    return {
        ...mergeDecision({
            claim,
            userProfile,
            fraudAnalysis: analyses.fraudAnalysis,
            graphAnalysis: analyses.graphAnalysis
        }),
        source: analyses.source
    };
}

async function evaluateClaim(workerId, disruptionFactor, userProfile = {}) {
    const claim = {
        workerId,
        amount: Number(disruptionFactor?.lossAmount || 0),
        trigger: disruptionFactor?.type,
        location: disruptionFactor?.location || userProfile.location || {},
        deviceInfo: disruptionFactor?.deviceInfo || userProfile.deviceInfo || {},
        externalData: disruptionFactor?.externalData || {},
        manualFlags: {
            locationMismatch: Boolean(disruptionFactor?.location_mismatch)
        }
    };
    return scoreClaim(claim, userProfile);
}

async function buildLocalFallbackDecision(workerId, disruptionFactor, userProfile = {}) {
    const claim = {
        workerId,
        amount: Number(disruptionFactor?.lossAmount || 0),
        trigger: disruptionFactor?.type,
        location: disruptionFactor?.location || {},
        deviceInfo: disruptionFactor?.deviceInfo || {},
        externalData: disruptionFactor?.externalData || {},
        manualFlags: {
            locationMismatch: Boolean(disruptionFactor?.location_mismatch)
        }
    };

    const payload = buildClaimPayload(claim, userProfile);
    return {
        ...mergeDecision({
            claim,
            userProfile,
            fraudAnalysis: localFraudAnalysis(payload.history, payload.current),
            graphAnalysis: localGraphAnalysis(payload.nodes, payload.edges)
        }),
        source: 'local_fallback'
    };
}

module.exports = {
    scoreClaim,
    evaluateClaim,
    buildLocalFallbackDecision,
    buildClaimPayload
};
