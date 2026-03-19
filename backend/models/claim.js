const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    workerId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    disruptionType: { type: String, enum: ['RAIN', 'HEATWAVE', 'POLLUTION', 'CURFEW'] },
    claimAmount: { type: Number },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'FLAGGED', 'REJECTED'], default: 'PENDING' },
    trustScore: { type: Number },
    paymentId: { type: String }
});

module.exports = mongoose.model('Claim', ClaimSchema);
