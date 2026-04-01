const mongoose = require('mongoose');

const RiskZoneSchema = new mongoose.Schema({
    zoneId: { type: String, required: true, unique: true },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'SEVERE'], default: 'LOW' },
    avgClaims: { type: Number, default: 0 },
    weatherPattern: { type: String, default: 'NORMAL' },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RiskZone', RiskZoneSchema);
