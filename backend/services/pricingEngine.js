const fs = require('fs');
const config = require('../config');

const pricingConfig = JSON.parse(fs.readFileSync(config.sharedPricingConfigPath, 'utf8'));

function roundCurrency(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function calculateCredibility(claimHistory = []) {
    if (!Array.isArray(claimHistory) || claimHistory.length === 0) return 0.1;

    const nClaims = claimHistory.length;
    const approvedClaims = claimHistory.filter((claim) => claim.status === 'APPROVED').length;
    const historicalFrequency = approvedClaims / nClaims;
    const varianceHypothesis = historicalFrequency * (1 - historicalFrequency || 1);
    const credibilityWeight = varianceHypothesis > 0 ? nClaims / (nClaims + (0.25 / varianceHypothesis)) : 0.95;
    return Math.min(Math.max(credibilityWeight, 0.1), 0.95);
}

function calculatePremium(input = {}) {
    const {
        weather = 0,
        traffic = 0,
        location = 0,
        persona_type = 'FOOD_DELIVERY',
        reputation_score = 85,
        claim_history = [],
        zone = 'Delhi NCR',
        avg_payout_per_event = pricingConfig.averagePayoutDefault
    } = input;

    const personaMultiplier = pricingConfig.personaMultipliers[persona_type] || 1;
    const zoneMultiplier = pricingConfig.zoneAdjustments[zone] || 1;
    const credibility = calculateCredibility(claim_history);

    const linearCombination =
        pricingConfig.intercept +
        pricingConfig.weatherCoefficient * Number(weather) +
        pricingConfig.trafficCoefficient * Number(traffic) +
        pricingConfig.locationCoefficient * Number(location);

    let claimProbability = 1 / (1 + Math.exp(-linearCombination));
    claimProbability = Math.min(Math.max(claimProbability, pricingConfig.minimumProbability), pricingConfig.maximumProbability);

    claimProbability *= personaMultiplier * zoneMultiplier;

    if (claim_history.length > 0) {
        const historicalFrequency = claim_history.filter((claim) => claim.status === 'APPROVED').length / claim_history.length;
        claimProbability = (claimProbability * (1 - credibility)) + (historicalFrequency * credibility);
    }

    const reputationDiscount = Math.max(0, (Number(reputation_score) - 80) * 0.005);
    claimProbability *= (1 - reputationDiscount);
    claimProbability = Math.min(Math.max(claimProbability, pricingConfig.minimumProbability), pricingConfig.maximumProbability);

    const expectedLoss = claimProbability * Number(avg_payout_per_event || pricingConfig.averagePayoutDefault);
    const riskAdjustment = expectedLoss * pricingConfig.riskMarginRate;
    const platformFee = pricingConfig.platformFee;
    const finalPremium = Math.max(pricingConfig.minimumPremium, expectedLoss + riskAdjustment + platformFee);
    const riskScore = Math.round((claimProbability / pricingConfig.maximumProbability) * 1000) / 10;

    let riskLevel = 'LOW';
    if (riskScore >= 70) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';

    return {
        base_premium: roundCurrency(expectedLoss),
        risk_adjustment: roundCurrency(riskAdjustment),
        platform_fee: roundCurrency(platformFee),
        final_premium: roundCurrency(finalPremium),
        weekly_premium_inr: roundCurrency(finalPremium),
        expected_loss: roundCurrency(expectedLoss),
        risk_margin: roundCurrency(riskAdjustment),
        risk_level: riskLevel,
        risk_score: riskScore,
        final_probability: Math.round(claimProbability * 10000) / 10000,
        credibility: Math.round(credibility * 100) / 100,
        breakdown: {
            base_premium: roundCurrency(expectedLoss),
            risk_adjustment: roundCurrency(riskAdjustment),
            platform_fee: roundCurrency(platformFee),
            final_premium: roundCurrency(finalPremium)
        }
    };
}

module.exports = {
    calculatePremium,
    calculateCredibility,
    pricingConfig
};
