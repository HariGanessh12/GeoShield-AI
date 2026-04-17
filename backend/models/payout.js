const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true, index: true },
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], required: true, default: 'PENDING' },
    transactionId: { type: String, required: true, unique: true },
    paymentMethod: { type: String, enum: ['UPI', 'BANK'], required: true },
    provider: { type: String, default: 'Simulated Payment (Razorpay-ready)' },
    message: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Object, default: {} }
});

PayoutSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Payout', PayoutSchema);
