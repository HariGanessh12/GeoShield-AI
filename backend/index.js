require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./middleware/authMiddleware');

const app = express();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geoshield')
  .then(() => console.log('✅ Connected to MongoDB GeoShield-AI successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Performance / Security: API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP
    message: { error: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use('/api', apiLimiter);

// Basic status route
app.get('/health', (req, res) => res.json({ status: 'GeoShield-AI Platform Operational' }));

// Feature Routers (Public)
app.use('/api/auth', require('./api/auth'));

// Protected Routes
app.use('/api/claim', verifyToken, require('./api/claim'));
app.use('/api/risk', verifyToken, require('./api/risk'));
app.use('/api/policy', verifyToken, require('./api/policy'));
app.use('/api/metrics', verifyToken, require('./api/metrics'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`[GeoShield-AI] API Gateway listening on port ${PORT}`);
});
