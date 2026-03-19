const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    workerId: { type: String, required: true },
    trigger: { type: String },
    trustScore: { type: Number },
    status: { type: String },
    payout: { type: Number },
    reputationScore: { type: Number },
    reasons: { type: [String] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Claim', ClaimSchema);
