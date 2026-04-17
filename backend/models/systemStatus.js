const mongoose = require('mongoose');

const SystemStatusSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, default: 'automatedTriggerMonitor' },
    lastScanAt: { type: Date, default: null },
    nextScanAt: { type: Date, default: null },
    lastTriggerDetected: { type: Object, default: null },
    triggersDetected: { type: [Object], default: [] },
    scanIntervalMinutes: { type: Number, default: 15 },
    updatedAt: { type: Date, default: Date.now }
});

SystemStatusSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('SystemStatus', SystemStatusSchema);
