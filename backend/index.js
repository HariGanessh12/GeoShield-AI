require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB GeoShield-AI successfully!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Basic status route
app.get('/health', (req, res) => res.json({ status: 'GeoShield-AI Platform Operational' }));

// Feature Routers
app.use('/api/auth', require('./api/auth'));
app.use('/api/claim', require('./api/claim'));
app.use('/api/risk', require('./api/risk'));
app.use('/api/policy', require('./api/policy'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`[GeoShield-AI] API Gateway listening on port ${PORT}`);
});
