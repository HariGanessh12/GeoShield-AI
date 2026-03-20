const mongoose = require('mongoose');

const PolicySchema = new mongoose.Schema({
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    premiumPaid: { type: Number, required: true },
    coverageAmount: { type: Number, default: 3500 },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Policy', PolicySchema);
