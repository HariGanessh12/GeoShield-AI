const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`[GeoShield-AI] API Gateway listening on port ${PORT}`);
});
