const POLICY_RULES = {
    waiting_period_hours: 24,
    max_claims_per_week: 1,
    min_severity_for_approval: 0.5,
    payout_cap_strategy: 'min(maxPayoutPerEvent, coverageAmount)',
    exclusions: [
        'inactive_policy',
        'outside_coverage_hours',
        'event_not_covered',
        'suspicious_activity',
        'claim_limit_exceeded'
    ],
    coverage_rules: [
        'Policy must be active',
        'Shift coverage must be ON',
        'Event must be covered by the policy',
        'Waiting period must be completed',
        'Requested payout must remain within policy caps'
    ]
};

module.exports = POLICY_RULES;
