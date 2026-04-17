const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_BASE_URL || (process.env.NODE_ENV === 'production' ? "" : "http://localhost:8001");

function buildClaimPayload(workerId, disruptionFactor, userProfile) {
    const history = Array.isArray(userProfile.claims_history) ? userProfile.claims_history : [];
    return {
        history,
        current: disruptionFactor.lossAmount || 200,
        graphNodes: ["device-1", "ip-1", "geo-1", workerId],
        graphEdges: [["device-1", "ip-1"]]
    };
}

function analyzeBehavioralRisk(history, currentClaimAmount) {
    if (!history || history.length < 2) {
        return {
            anomaly_score: 0,
            is_anomaly: false,
            confidence: 1,
            reason: "insufficient_history"
        };
    }

    const numericHistory = history.map(Number).filter(Number.isFinite);
    if (numericHistory.length < 2) {
        return {
            anomaly_score: 0,
            is_anomaly: false,
            confidence: 1,
            reason: "insufficient_history"
        };
    }

    const average = numericHistory.reduce((sum, value) => sum + value, 0) / numericHistory.length;
    const deviationRatio = average > 0 ? Math.abs(currentClaimAmount - average) / average : 0;
    const isAnomaly = deviationRatio >= 0.8 || currentClaimAmount >= average * 2.5;

    return {
        anomaly_score: isAnomaly ? -0.6 : 0.2,
        is_anomaly: isAnomaly,
        confidence: 0.85,
        reason: isAnomaly ? "local_deviation_check" : "normal_activity"
    };
}

function analyzeCoordinatedAttack(nodes, edges) {
    const adjacency = new Map();
    for (const node of nodes) {
        adjacency.set(node, new Set());
    }

    for (const [a, b] of edges) {
        if (!adjacency.has(a)) adjacency.set(a, new Set());
        if (!adjacency.has(b)) adjacency.set(b, new Set());
        adjacency.get(a).add(b);
        adjacency.get(b).add(a);
    }

    const visited = new Set();
    const components = [];

    for (const node of adjacency.keys()) {
        if (visited.has(node)) continue;

        const stack = [node];
        const component = [];

        while (stack.length > 0) {
            const current = stack.pop();
            if (visited.has(current)) continue;
            visited.add(current);
            component.push(current);

            for (const neighbor of adjacency.get(current) || []) {
                if (!visited.has(neighbor)) stack.push(neighbor);
            }
        }

        components.push(component);
    }

    const fraudRings = components.filter((component) => component.length > 2);

    return {
        graph_size: adjacency.size,
        total_edges: edges.length,
        detected_fraud_rings: fraudRings,
        ring_count: fraudRings.length,
        network_risk_level: fraudRings.length > 0 ? "HIGH" : "LOW"
    };
}

function scoreClaim(claim, userProfile) {
    let trustScore = 100;
    const reasons = [];
    const adjustments = [];

    reasons.push(`Verified ${claim.trigger} parametric trigger`);

    // Behavioral anomaly check
    const fraudAnalysis = analyzeBehavioralRisk(userProfile.claims_history || [], claim.amount || 200);
    if (fraudAnalysis.is_anomaly) {
        trustScore -= 35;
        reasons.push("Behavioral anomaly detected in historical claims");
        adjustments.push({ factor: "AI Fraud Penalty", delta: -35 });
    } else {
        reasons.push("Claim pattern is historically consistent");
    }

    // Graph analysis (mock for now)
    const graphAnalysis = analyzeCoordinatedAttack(
        ["device-1", "ip-1", "geo-1", claim.workerId],
        [["device-1", "ip-1"]]
    );
    if (graphAnalysis.network_risk_level === "HIGH" && graphAnalysis.ring_count > 0) {
        trustScore -= 45;
        reasons.push("Suspicious IP/Device clustering detected (Ring Association)");
        adjustments.push({ factor: "Coordinated Attack Flag", delta: -45 });
    }

    // GPS validation
    if (claim.location && claim.deviceInfo) {
        const gpsValidation = validateGPSLocation(claim, userProfile);
        trustScore += gpsValidation.scoreAdjustment;
        reasons.push(...gpsValidation.reasons);
        adjustments.push(...gpsValidation.adjustments);
    }

    // Timestamp validation
    if (claim.externalData && claim.externalData.realData) {
        const timeValidation = validateEventTiming(claim);
        trustScore += timeValidation.scoreAdjustment;
        reasons.push(...timeValidation.reasons);
        adjustments.push(...timeValidation.adjustments);
    }

    // Velocity checks (claims per hour/day)
    const velocityCheck = checkClaimVelocity(claim.workerId, claim.createdAt);
    trustScore += velocityCheck.scoreAdjustment;
    reasons.push(...velocityCheck.reasons);
    adjustments.push(...velocityCheck.adjustments);

    // Reputation bonus
    const reputation = userProfile.reputation || 85;
    if (reputation > 80) {
        trustScore += 10;
        reasons.push(`+10 Trust Bonus: Excellent worker reputation (${reputation}/100)`);
        adjustments.push({ factor: "Reputation Bonus", delta: 10 });
    }

    // Grace buffer for tenured workers
    if (trustScore >= 40 && trustScore < 50 && reputation > 70) {
        const adjustedScore = 50;
        reasons.push("Grace Buffer applied for tenured worker.");
        adjustments.push({ factor: "Grace Buffer Adjustment", delta: adjustedScore - trustScore });
        trustScore = adjustedScore;
    }

    trustScore = Math.min(100, Math.max(0, trustScore));

    let decision = "REJECTED";
    if (trustScore >= 80) decision = "APPROVED";
    else if (trustScore >= 50) decision = "VERIFY";

    return {
        status: decision,
        trustScore,
        aiConfidence: fraudAnalysis.confidence || 0.85,
        adjustments,
        reasons,
        payout: decision === "APPROVED" ? "Instant UPI Payout" : (decision === "VERIFY" ? "Pending Manual Appeal" : "None")
    };
}

function validateGPSLocation(claim, userProfile) {
    let scoreAdjustment = 0;
    const reasons = [];
    const adjustments = [];

    const { location, deviceInfo } = claim;

    // GPS accuracy check
    if (location.accuracy > 100) { // Poor accuracy
        scoreAdjustment -= 15;
        reasons.push("GPS accuracy is poor (>100m) - location verification uncertain");
        adjustments.push({ factor: "Poor GPS Accuracy", delta: -15 });
    }

    // GPS timestamp check (should be recent)
    if (location.timestamp) {
        const gpsAge = Date.now() - new Date(location.timestamp).getTime();
        if (gpsAge > 30 * 60 * 1000) { // 30 minutes old
            scoreAdjustment -= 20;
            reasons.push("GPS data is stale (>30 minutes old)");
            adjustments.push({ factor: "Stale GPS Data", delta: -20 });
        }
    }

    // Zone validation
    if (location.zone && userProfile.zone && location.zone !== userProfile.zone) {
        scoreAdjustment -= 30;
        reasons.push(`GPS zone (${location.zone}) does not match expected delivery zone (${userProfile.zone})`);
        adjustments.push({ factor: "Delivery Zone Mismatch", delta: -30 });
    }

    // IP-GPS consistency (mock check)
    if (deviceInfo.ipAddress) {
        // In production, would geolocate IP and compare with GPS
        const ipLocation = mockIPGeolocation(deviceInfo.ipAddress);
        if (ipLocation && location.coordinates) {
            const distance = calculateDistance(
                location.coordinates.lat, location.coordinates.lng,
                ipLocation.lat, ipLocation.lng
            );
            if (distance > 50) { // 50km mismatch
                scoreAdjustment -= 35;
                reasons.push("GPS-IP mismatch detected during claim window");
                adjustments.push({ factor: "GPS-IP Mismatch Penalty", delta: -35 });
            }
        }
    }

    return { scoreAdjustment, reasons, adjustments };
}

function validateEventTiming(claim) {
    let scoreAdjustment = 0;
    const reasons = [];
    const adjustments = [];

    if (claim.externalData && claim.externalData.realData) {
        const eventTime = new Date(claim.externalData.realData.timestamp || claim.createdAt);
        const claimTime = new Date(claim.createdAt);
        const timeDiff = Math.abs(claimTime - eventTime);

        if (timeDiff > 2 * 60 * 60 * 1000) { // 2 hours diff
            scoreAdjustment -= 25;
            reasons.push("Claim timestamp is historically inconsistent with actual weather event timestamp");
            adjustments.push({ factor: "Timestamp Mismatch Penalty", delta: -25 });
        }
    }

    return { scoreAdjustment, reasons, adjustments };
}

function checkClaimVelocity(workerId, claimTimestamp) {
    let scoreAdjustment = 0;
    const reasons = [];
    const adjustments = [];

    // Mock velocity check - in production, query database
    const recentClaims = 2; // Mock: assume 2 recent claims

    if (recentClaims > 3) { // More than 3 claims in last hour
        scoreAdjustment -= 40;
        reasons.push("High claim velocity detected - potential abuse");
        adjustments.push({ factor: "Claim Velocity Penalty", delta: -40 });
    }

    return { scoreAdjustment, reasons, adjustments };
}

function mockIPGeolocation(ip) {
    // Mock IP geolocation - in production, use service like MaxMind
    const mockLocations = {
        '192.168.1.1': { lat: 28.6139, lng: 77.2090 }, // Delhi
        '10.0.0.1': { lat: 19.0760, lng: 72.8777 } // Mumbai
    };
    return mockLocations[ip] || null;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function buildLocalFallbackDecision(workerId, disruptionFactor, userProfile) {
    const payload = buildClaimPayload(workerId, disruptionFactor, userProfile);
    const fraudAnalysis = analyzeBehavioralRisk(payload.history, payload.current);
    const graphAnalysis = analyzeCoordinatedAttack(payload.graphNodes, payload.graphEdges);

    return {
        ...scoreClaim(workerId, disruptionFactor, userProfile, fraudAnalysis, graphAnalysis),
        source: "local_fallback"
    };
}

async function evaluateClaim(workerId, disruptionFactor, userProfile) {
    const payload = buildClaimPayload(workerId, disruptionFactor, userProfile);

    try {
        if (!AI_ENGINE_BASE_URL) {
            console.warn("AI engine base URL is not configured. Using local fallback.");
            return buildLocalFallbackDecision(workerId, disruptionFactor, userProfile);
        }

        const fraudFetchOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history: payload.history,
                current: payload.current
            })
        };

        const graphFetchOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nodes: payload.graphNodes,
                edges: payload.graphEdges
            })
        };

        const [fraudResponse, graphResponse] = await Promise.all([
            fetch(`${AI_ENGINE_BASE_URL.replace(/\/$/, "")}/fraud-detect`, fraudFetchOptions),
            fetch(`${AI_ENGINE_BASE_URL.replace(/\/$/, "")}/graph-detect`, graphFetchOptions)
        ]);

        if (!fraudResponse.ok || !graphResponse.ok) {
            throw new Error(`FastAPI Dependency Failure. Fraud: ${fraudResponse.statusText}, Graph: ${graphResponse.statusText}`);
        }

        const fraudAnalysis = await fraudResponse.json();
        const graphAnalysis = await graphResponse.json();

        return scoreClaim(workerId, disruptionFactor, userProfile, fraudAnalysis, graphAnalysis);
    } catch (err) {
        console.warn("AI Engine API unavailable, using local fallback:", err.message);
        return buildLocalFallbackDecision(workerId, disruptionFactor, userProfile);
    }
}

module.exports = { evaluateClaim, buildLocalFallbackDecision };
