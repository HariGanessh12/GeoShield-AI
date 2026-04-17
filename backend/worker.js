require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const { logInfo, logError } = require('./utils/logger');
const { startBackgroundJobs } = require('./services/backgroundJobs');

async function bootWorker() {
    try {
        await mongoose.connect(config.mongoUri);
        logInfo('worker.mongo_connected', { workerInstanceId: config.workerInstanceId });
        startBackgroundJobs();
        logInfo('worker.jobs_started', { workerInstanceId: config.workerInstanceId });
    } catch (error) {
        logError('worker.boot_failed', error, { workerInstanceId: config.workerInstanceId });
        process.exitCode = 1;
    }
}

bootWorker();
