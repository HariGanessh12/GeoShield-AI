require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const { verifyToken } = require('./middleware/authMiddleware');
const { sendSuccess, sendError } = require('./utils/http');
const pkg = require('./package.json');

const app = express();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geoshield')
  .then(() => console.log('✅ Connected to MongoDB GeoShield-AI successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

app.use(express.json());
app.use(cors());
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
        const durationMs = Date.now() - startedAt;
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs
        }));
    });
    next();
});

// Performance / Security: API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP
    handler: (req, res) => sendError(res, 429, "Too many requests from this IP, please try again after 15 minutes")
});
app.use('/api', apiLimiter);

// Basic status route
app.get('/', (req, res) => sendSuccess(res, { status: 'GeoShield-AI API operational' }));
app.get('/health', (req, res) => sendSuccess(res, { status: 'healthy' }));
app.get('/version', (req, res) => sendSuccess(res, {
    service: 'backend',
    name: pkg.name,
    version: pkg.version,
    environment: process.env.NODE_ENV || 'development'
}));

// Feature Routers (Public)
app.use('/api/auth', require('./api/auth'));

// Protected Routes
app.use('/api/claim', verifyToken, require('./api/claim'));
app.use('/api/worker', verifyToken, require('./api/worker'));
app.use('/api/risk', verifyToken, require('./api/risk'));
app.use('/api/policy', verifyToken, require('./api/policy'));
app.use('/api/metrics', verifyToken, require('./api/metrics'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`[GeoShield-AI] API Gateway listening on port ${PORT}`);
});
