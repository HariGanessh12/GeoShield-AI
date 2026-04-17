const mongoose = require('mongoose');

const JobLeaseSchema = new mongoose.Schema({
    jobName: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true },
    lockedUntil: { type: Date, required: true },
    lastRunAt: { type: Date, default: null }
});

module.exports = mongoose.model('JobLease', JobLeaseSchema);
