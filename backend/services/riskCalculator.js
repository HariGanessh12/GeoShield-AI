/**
 * Advanced Actuarial Premium Calculation (JavaScript Implementation)
 * Fallback when Python subprocess is unavailable
 */

function calculateCredibility(claimHistory = []) {
    if (!claimHistory || claimHistory.length === 0) {
        return 0.1; // Low credibility for new users
    }

    const n_claims = claimHistory.length;
    const approved_claims = claimHistory.filter(c => c.status === 'APPROVED').length;

    // Bühlmann-Straub credibility model
    const process_variance = 0.25;
    const expected_frequency = 0.15;
    const variance_hypothesis = expected_frequency * (1 - expected_frequency);
    const k = process_variance / variance_hypothesis;

    const credibility = n_claims / (n_claims + k);
    return Math.min(credibility, 0.95);
}

function calculatePremium(input) {
    const {
        weather = 0,
        traffic = 0,
        location = 0,
        persona_type = 'FOOD_DELIVERY',
        reputation_score = 85,
        claim_history = [],
        zone = 'Delhi NCR'
    } = input;

    // Persona risk multipliers
    const persona_multipliers = {
        'FOOD_DELIVERY': 1.0,
        'GROCERY_DELIVERY': 1.15,
        'BIKE_TAXI': 1.25
    };
    const persona_multiplier = persona_multipliers[persona_type] || 1.0;

    // Zone adjustments
    const zone_adjustments = {
        'Delhi NCR': 1.0,
        'Mumbai South': 1.05,
        'Bangalore Central': 0.95
    };
    const zone_multiplier = zone_adjustments[zone] || 1.0;

    // Base probability using logistic regression
    const intercept = -3.5;
    const weather_coeff = 0.025;
    const traffic_coeff = 0.018;
    const location_coeff = 0.022;

    const linear_combination = intercept +
        (weather_coeff * weather) +
        (traffic_coeff * traffic) +
        (location_coeff * location);

    let base_probability = 1 / (1 + Math.exp(-linear_combination));
    base_probability = Math.max(0.005, Math.min(base_probability, 0.25));

    // Adjust for persona and zone
    let adjusted_probability = base_probability * persona_multiplier * zone_multiplier;

    // Credibility weighting
    const credibility = calculateCredibility(claim_history);

    if (claim_history && claim_history.length > 0) {
        const historical_freq = claim_history.filter(c => c.status === 'APPROVED').length / claim_history.length;
        if (historical_freq > adjusted_probability) {
            adjusted_probability = Math.min(adjusted_probability * 1.1, 0.35);
        } else if (historical_freq < adjusted_probability * 0.5) {
            adjusted_probability *= 0.9;
        }
    }

    // Reputation adjustment
    const reputation_discount = Math.max(0, (reputation_score - 80) * 0.005);

    const final_probability = adjusted_probability * (1 - reputation_discount);

    // Actuarial calculations
    const claim_probability = typeof input.claim_probability === 'number'
        ? Math.min(Math.max(input.claim_probability, 0), 1)
        : final_probability;

    const AVG_PAYOUT_PER_EVENT = Number(input.avg_payout_per_event) || 400.0;
    const PLATFORM_FEE = 15.0;
    const RISK_MARGIN_RATE = 0.30;
    const MINIMUM_PREMIUM = 55.0;

    const expected_loss = claim_probability * AVG_PAYOUT_PER_EVENT;
    const risk_margin = expected_loss * RISK_MARGIN_RATE;
    const premium_before_floor = expected_loss + risk_margin + PLATFORM_FEE;
    let weekly_premium = Math.max(MINIMUM_PREMIUM, premium_before_floor);

    // Risk categorization
    const risk_score = (final_probability / 0.25) * 100;
    let risk_level = 'LOW';
    if (risk_score > 70) risk_level = 'HIGH';
    else if (risk_score > 40) risk_level = 'MEDIUM';

    // Breakdown for transparency
    const breakdown = {
        'Base Premium': `₹${expected_loss.toFixed(2)} (${(claim_probability * 100).toFixed(1)}% × ₹${AVG_PAYOUT_PER_EVENT})`,
        'Risk Margin': `₹${risk_margin.toFixed(2)}`,
        'Platform Fee': `₹${PLATFORM_FEE.toFixed(2)}`,
        'Final Premium': `₹${weekly_premium.toFixed(2)}`
    };

    const loss_ratio_projection = weekly_premium > 0 ? (expected_loss / weekly_premium) * 100 : 0;

    return {
        risk_level,
        risk_score: Math.round(risk_score * 10) / 10,
        weekly_premium_inr: Math.round(weekly_premium * 100) / 100,
        expected_loss: Math.round(expected_loss * 100) / 100,
        risk_margin: Math.round(risk_margin * 100) / 100,
        platform_fee: Math.round(PLATFORM_FEE * 100) / 100,
        base_premium: Math.round(expected_loss * 100) / 100,
        final_premium: Math.round(weekly_premium * 100) / 100,
        final_probability: Math.round(final_probability * 10000) / 10000,
        credibility: Math.round(credibility * 100) / 100,
        breakdown,
        loss_ratio_projection: Math.round(loss_ratio_projection * 10) / 10
    };
}

module.exports = {
    calculatePremium,
    calculateCredibility
};