const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['worker', 'admin'], default: 'worker' },
    persona: { type: String, enum: ['Food Delivery', 'Grocery Q-Commerce', 'E-commerce', 'N/A'], default: 'Food Delivery' },
    zone: { type: String, enum: ['Delhi NCR', 'Mumbai South', 'Bangalore Central', 'N/A'], default: 'Delhi NCR' },
    reputationScore: { type: Number, default: 85 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
