const { sendError } = require('../utils/http');
const { verifyAuthToken, getTokenFromRequest } = require('../services/sessionService');

function verifyToken(req, res, next) {
    const token = getTokenFromRequest(req);
    if (!token) {
        return sendError(res, 401, "Access denied. No token provided.");
    }

    try {
        const decoded = verifyAuthToken(token);
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
