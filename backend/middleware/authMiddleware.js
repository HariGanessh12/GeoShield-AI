const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'geoshield_super_secret_key_2026';

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token." });
    }
}

function verifyAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
}

module.exports = { verifyToken, verifyAdmin };
