const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    workerId: { type: String, required: true },
    trigger: { type: String },
    claimAmount: { type: Number },
    trustScore: { type: Number },
    status: { type: String },
    payout: { type: Number },
    reputationScore: { type: Number },
    reasons: { type: [String] },
    createdAt: { type: Date, default: Date.now }
});

// Performance: Add DB Indexes
ClaimSchema.index({ status: 1 });
ClaimSchema.index({ trigger: 1 });

module.exports = mongoose.model('Claim', ClaimSchema);
