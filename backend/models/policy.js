const mongoose = require('mongoose');

// We enforce strict ON/OFF states (no intermediate) because gig workers 
// need instant coverage activation — ambiguous states = uncovered incidents

const PolicySchema = new mongoose.Schema({
    workerId: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    premiumPaid: { type: Number, required: true },
    coverageAmount: { type: Number, default: 3500 },
    totalPremiumCollected: { type: Number, default: 0 },
    totalClaimsPaid: { type: Number, default: 0 },
    lossRatio: { type: Number, default: 0 },
    payoutMultiplier: { type: Number, enum: [2, 3], default: 3 },
    coveredEvents: { type: [String], default: ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE'] },
    exclusions: { type: [String], default: ['INACTIVE_WORKER', 'GPS_MISMATCH', 'ALREADY_COMPENSATED', 'FRAUD_FLAGGED', 'DEVICE_ANOMALY'] },
    maxPayoutPerEvent: { type: Number, default: 1000 },
    waitingPeriod: { type: Number, default: 0 },
    activeHoursRequired: { type: Number, default: 4 },
    shiftState: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
    lastToggledAt: { type: Date },
    toggleCount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Policy', PolicySchema);
