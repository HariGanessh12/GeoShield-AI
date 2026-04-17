require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const { verifyToken, verifyAdmin } = require('./middleware/authMiddleware');
const financialService = require('./services/financialService');
const { sendSuccess, sendError } = require('./utils/http');
const pkg = require('./package.json');
const config = require('./config');
const { logInfo, logError } = require('./utils/logger');

const app = express();

mongoose.connect(config.mongoUri)
    .then(() => logInfo('mongo.connected', { env: config.env }))
    .catch((error) => logError('mongo.connection_error', error));

app.use(express.json());
app.use(cors({
    origin(origin, callback) {
        if (!origin && !config.isProduction) return callback(null, true);
        if (!origin && config.corsAllowNullOrigin) return callback(null, true);
        if (origin && config.trustedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS policy'));
    },
    credentials: true
}));
app.use(helmet());

app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.requestId = String(requestId);
    res.setHeader('x-request-id', req.requestId);
    next();
});

app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        logInfo('http.request.completed', {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt
        });
    });
    next();
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => sendError(res, 429, 'Too many requests from this IP, please try again after 15 minutes')
});
app.use('/api', apiLimiter);

app.get('/', (req, res) => sendSuccess(res, { status: 'GeoShield-AI API operational' }));
app.get('/health', (req, res) => sendSuccess(res, { status: 'healthy' }));
app.get('/version', (req, res) => sendSuccess(res, {
    service: 'backend',
    name: pkg.name,
    version: pkg.version,
    environment: config.env
}));
app.get('/admin/financials', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const metrics = await financialService.getBusinessMetrics();
        return sendSuccess(res, metrics);
    } catch (error) {
        logError('admin.financials_failed', error, { requestId: req.requestId });
        return sendError(res, 500, 'Could not fetch financial metrics');
    }
});

app.use('/api/auth', require('./api/auth'));
app.use('/api/claim', verifyToken, require('./api/claim'));
app.use('/api/worker', verifyToken, require('./api/worker'));
app.use('/api/risk', verifyToken, require('./api/risk'));
app.use('/api/policy', verifyToken, require('./api/policy'));
app.use('/api/metrics', verifyToken, require('./api/metrics'));
app.use('/api/payout', verifyToken, require('./api/payout'));
app.use('/api/admin', verifyToken, verifyAdmin, require('./api/admin'));
app.use('/system', require('./api/system'));

app.use((error, req, res, next) => {
    if (error?.message?.includes('CORS')) {
        return sendError(res, 403, error.message);
    }
    logError('http.unhandled_error', error, { requestId: req.requestId, path: req.originalUrl });
    return sendError(res, 500, 'Unhandled server error');
});

app.listen(config.port, () => {
    logInfo('http.server_started', { port: config.port, env: config.env, runJobs: config.runJobs });
});
