require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/user');
const Claim = require('../models/claim');

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email: 'user@gmail.com' });
    if (!user) {
        throw new Error('user@gmail.com not found');
    }

    const workerId = String(user._id);
    const reputationScore = user.reputationScore || 85;

    await Claim.deleteMany({ workerId });

    const now = Date.now();
    const sampleClaims = [
        {
            trigger: 'PLATFORM_OUTAGE',
            claimAmount: 420,
            trustScore: 94,
            status: 'APPROVED',
            payout: 420,
            reasons: [
                'Verified PLATFORM_OUTAGE parametric trigger',
                'Claim pattern is historically consistent',
                '+10 Trust Bonus: Excellent worker reputation (85/100)'
            ]
        },
        {
            trigger: 'HEAVY_RAIN',
            claimAmount: 510,
            trustScore: 91,
            status: 'APPROVED',
            payout: 510,
            reasons: [
                'Verified HEAVY_RAIN parametric trigger',
                'Claim pattern is historically consistent',
                '+10 Trust Bonus: Excellent worker reputation (85/100)'
            ]
        },
        {
            trigger: 'HEATWAVE',
            claimAmount: 460,
            trustScore: 93,
            status: 'APPROVED',
            payout: 460,
            reasons: [
                'Verified HEATWAVE parametric trigger',
                'Claim pattern is historically consistent',
                '+10 Trust Bonus: Excellent worker reputation (85/100)'
            ]
        },
        {
            trigger: 'HEAVY_RAIN',
            claimAmount: 480,
            trustScore: 89,
            status: 'APPROVED',
            payout: 480,
            reasons: [
                'Verified HEAVY_RAIN parametric trigger',
                'Claim pattern is historically consistent',
                '+10 Trust Bonus: Excellent worker reputation (85/100)'
            ]
        },
        {
            trigger: 'PLATFORM_OUTAGE',
            claimAmount: 730,
            trustScore: 42,
            status: 'REJECTED',
            payout: 0,
            reasons: [
                'Verified PLATFORM_OUTAGE parametric trigger',
                'Behavioral anomaly detected in historical claims',
                'Suspicious IP/Device clustering detected (Ring Association)'
            ]
        },
        {
            trigger: 'HEATWAVE',
            claimAmount: 390,
            trustScore: 88,
            status: 'APPROVED',
            payout: 390,
            reasons: [
                'Verified HEATWAVE parametric trigger',
                'Claim pattern is historically consistent',
                '+10 Trust Bonus: Excellent worker reputation (85/100)'
            ]
        },
        {
            trigger: 'HEAVY_RAIN',
            claimAmount: 680,
            trustScore: 38,
            status: 'REJECTED',
            payout: 0,
            reasons: [
                'Verified HEAVY_RAIN parametric trigger',
                'Behavioral anomaly detected in historical claims',
                'Suspicious IP/Device clustering detected (Ring Association)'
            ]
        },
        {
            trigger: 'PLATFORM_OUTAGE',
            claimAmount: 440,
            trustScore: 92,
            status: 'APPROVED',
            payout: 440,
            reasons: [
                'Verified PLATFORM_OUTAGE parametric trigger',
                'Claim pattern is historically consistent',
                '+10 Trust Bonus: Excellent worker reputation (85/100)'
            ]
        }
    ];

    await Claim.insertMany(
        sampleClaims.map((claim, index) => ({
            ...claim,
            workerId,
            reputationScore,
            createdAt: new Date(now - index * 24 * 60 * 60 * 1000)
        }))
    );

    const count = await Claim.countDocuments({ workerId });
    console.log(`Updated user@gmail.com (${workerId}) with ${count} sample claims.`);
}

main()
    .catch((error) => {
        console.error('Reset user claims failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
