const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
    workerId: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    premiumPaid: { type: Number, required: true },
    coverageAmount: { type: Number, default: 3500 },
    coveredEvents: { type: [String], default: ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE'] },
    exclusions: { type: [String], default: ['INACTIVE_WORKER', 'GPS_MISMATCH', 'ALREADY_COMPENSATED', 'FRAUD_FLAGGED', 'DEVICE_ANOMALY'] },
    maxPayoutPerEvent: { type: Number, default: 1000 },
    waitingPeriod: { type: Number, default: 0 },
    activeHoursRequired: { type: Number, default: 4 },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Policy', PolicySchema);
