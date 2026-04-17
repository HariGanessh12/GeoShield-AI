const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    workerId: { type: String, required: true },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },
    trigger: { type: String },
    amount: { type: Number }, // Rename from claimAmount for consistency
    trustScore: { type: Number },
    status: { type: String },
    payout: { type: Number },
    reputationScore: { type: Number },
    reasons: { type: [String] },
    adjustments: { type: [Object] }, // Trust score adjustments
    source: { type: String, default: 'manual_trigger' },
    automated: { type: Boolean, default: false },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: '' },
    transactionId: { type: String, default: null },
    payoutStatus: { type: String, default: 'PENDING' },
    payoutProcessedAt: { type: Date, default: null },
    payoutMethod: { type: String, default: null },
    location: {
        zone: { type: String },
        coordinates: {
            lat: { type: Number },
            lng: { type: Number }
        },
        accuracy: { type: Number }, // GPS accuracy in meters
        timestamp: { type: Date } // When GPS was captured
    },
    deviceInfo: {
        ipAddress: { type: String },
        userAgent: { type: String },
        deviceId: { type: String } // For fraud detection
    },
    externalData: { type: Object, default: null }, // Weather/traffic data snapshot
    triggerSnapshot: { type: Object, default: null },
    createdAt: { type: Date, default: Date.now }
});

// Performance: Add DB Indexes
ClaimSchema.index({ status: 1 });
ClaimSchema.index({ trigger: 1 });
ClaimSchema.index({ workerId: 1, status: 1, createdAt: -1 });
ClaimSchema.index({ policyId: 1 });
ClaimSchema.index({ 'location.zone': 1 });
ClaimSchema.index({ automated: 1 });

module.exports = mongoose.model('Claim', ClaimSchema);
