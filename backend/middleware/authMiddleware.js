const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'geoshield_super_secret_key_2026';
const { sendError } = require('../utils/http');

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 401, "Access denied. No token provided.");
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return sendError(res, 401, "Invalid or expired token.");
    }
}

function verifyAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return sendError(res, 403, "Access denied. Admin privileges required.");
    }
}

module.exports = { verifyToken, verifyAdmin };
