const mongoose = require('mongoose');

const PolicyToggleLogSchema = new mongoose.Schema({
    workerId: { type: String, required: true, index: true },
    previousState: { type: String, enum: ['ON', 'OFF'], required: true },
    currentState: { type: String, enum: ['ON', 'OFF'], required: true },
    reason: { type: String, default: 'manual_toggle' },
    source: { type: String, default: 'web_app' },
    createdAt: { type: Date, default: Date.now }
});

PolicyToggleLogSchema.index({ workerId: 1, createdAt: -1 });

module.exports = mongoose.model('PolicyToggleLog', PolicyToggleLogSchema);
