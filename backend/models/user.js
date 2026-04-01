const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['worker', 'admin'], default: 'worker' },
    personaType: { type: String, enum: ['FOOD_DELIVERY', 'GROCERY_DELIVERY', 'BIKE_TAXI'], default: 'FOOD_DELIVERY' },
    workingHours: { type: Number, default: 8 },
    avgDailyTrips: { type: Number, default: 15 },
    cityZone: { type: String, default: 'Delhi NCR' },
    zone: { type: String, enum: ['Delhi NCR', 'Mumbai South', 'Bangalore Central', 'N/A'], default: 'Delhi NCR' },
    reputationScore: { type: Number, default: 85 },
    createdAt: { type: Date, default: Date.now }
});

// Performance: Add DB Indexes for common querying patterns
UserSchema.index({ zone: 1 });
UserSchema.index({ role: 1 });

module.exports = mongoose.model('User', UserSchema);
