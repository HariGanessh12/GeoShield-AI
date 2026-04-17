const path = require('path');

function parseCsv(value, fallback = []) {
    if (!value) return fallback;
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function toBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function requireValue(name, fallback) {
    const value = process.env[name] || fallback;
    if (!value) {
        throw new Error(`Missing required configuration: ${name}`);
    }
    return value;
}

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const defaultTrustedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://geo-shield-ai.vercel.app'
];

const config = {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 8000),
    mongoUri: requireValue('MONGO_URI', 'mongodb://localhost:27017/geoshield'),
    jwtSecret: requireValue('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test_jwt_secret' : null),
    jwtExpiry: process.env.JWT_EXPIRY || '1d',
    cookieName: process.env.AUTH_COOKIE_NAME || 'geoshield_session',
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    trustedOrigins: unique([
        ...defaultTrustedOrigins,
        ...parseCsv(process.env.TRUSTED_ORIGINS, [])
    ]),
    corsAllowNullOrigin: toBoolean(process.env.CORS_ALLOW_NULL_ORIGIN, false),
    aiEngineBaseUrl: process.env.AI_ENGINE_BASE_URL || 'http://localhost:8001',
    weatherApiKey: process.env.OPENWEATHER_API_KEY || '',
    weatherApiBaseUrl: process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5/weather',
    payoutProvider: process.env.PAYOUT_PROVIDER || 'test',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    runJobs: toBoolean(process.env.RUN_JOBS, false),
    workerInstanceId: process.env.WORKER_INSTANCE_ID || `${process.pid}`,
    rootDir: ROOT_DIR,
    sharedPricingConfigPath: path.join(ROOT_DIR, 'shared', 'pricing-config.json')
};

config.isProduction = config.env === 'production';
config.cookieSecure = config.isProduction || toBoolean(process.env.AUTH_COOKIE_SECURE, false);
config.cookieSameSite = config.isProduction ? 'none' : 'lax';

module.exports = config;
