const jwt = require('jsonwebtoken');
const config = require('../config');

function createAuthToken(payload) {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiry });
}

function verifyAuthToken(token) {
    return jwt.verify(token, config.jwtSecret);
}

function buildCookieOptions() {
    const parts = [
        'HttpOnly',
        'Path=/',
        `SameSite=${config.cookieSameSite}`,
        `Max-Age=${24 * 60 * 60}`
    ];

    if (config.cookieSecure) parts.push('Secure');
    if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
    return parts.join('; ');
}

function setAuthCookie(res, token) {
    res.setHeader('Set-Cookie', `${config.cookieName}=${token}; ${buildCookieOptions()}`);
}

function clearAuthCookie(res) {
    const parts = [
        `${config.cookieName}=`,
        'HttpOnly',
        'Path=/',
        `SameSite=${config.cookieSameSite}`,
        'Max-Age=0'
    ];
    if (config.cookieSecure) parts.push('Secure');
    if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
    res.setHeader('Set-Cookie', parts.join('; '));
}

function parseCookies(headerValue) {
    if (!headerValue) return {};
    return String(headerValue)
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, item) => {
            const idx = item.indexOf('=');
            if (idx === -1) return acc;
            const key = item.slice(0, idx).trim();
            const value = decodeURIComponent(item.slice(idx + 1).trim());
            acc[key] = value;
            return acc;
        }, {});
}

function getTokenFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim();
    }

    const cookies = parseCookies(req.headers.cookie);
    return cookies[config.cookieName] || null;
}

module.exports = {
    createAuthToken,
    verifyAuthToken,
    setAuthCookie,
    clearAuthCookie,
    getTokenFromRequest
};
