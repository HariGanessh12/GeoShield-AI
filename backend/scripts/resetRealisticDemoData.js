require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/user');
const Claim = require('../models/claim');
const Policy = require('../models/policy');
const PolicyToggleLog = require('../models/policyToggleLog');
const SystemStatus = require('../models/systemStatus');

const KEEP_LOGINS = {
    admin: 'admin@gmail.com',
    worker: 'user@gmail.com',
    password: 'password'
};

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            let admin = await User.findOne({ email: KEEP_LOGINS.admin }).session(session);
            if (!admin) {
                admin = await User.create([{
                    email: KEEP_LOGINS.admin,
                    password: KEEP_LOGINS.password,
                    role: 'admin',
                    personaType: 'FOOD_DELIVERY',
                    zone: 'Delhi NCR',
                    cityZone: 'Delhi NCR',
                    workingHours: 9,
                    avgDailyTrips: 0,
                    reputationScore: 98
                }], { session }).then((docs) => docs[0]);
            } else {
                admin.password = KEEP_LOGINS.password;
                admin.role = 'admin';
                admin.zone = admin.zone || 'Delhi NCR';
                admin.cityZone = admin.cityZone || admin.zone;
                admin.reputationScore = admin.reputationScore || 98;
                await admin.save({ session });
            }

            let worker = await User.findOne({ email: KEEP_LOGINS.worker }).session(session);
            if (!worker) {
                worker = await User.create([{
                    email: KEEP_LOGINS.worker,
                    password: KEEP_LOGINS.password,
                    role: 'worker',
                    personaType: 'FOOD_DELIVERY',
                    zone: 'Delhi NCR',
                    cityZone: 'Delhi NCR',
                    workingHours: 8,
                    avgDailyTrips: 22,
                    reputationScore: 91
                }], { session }).then((docs) => docs[0]);
            } else {
                worker.password = KEEP_LOGINS.password;
                worker.role = 'worker';
                worker.personaType = 'FOOD_DELIVERY';
                worker.zone = 'Delhi NCR';
                worker.cityZone = 'Delhi NCR';
                worker.workingHours = 8;
                worker.avgDailyTrips = 22;
                worker.reputationScore = 91;
                await worker.save({ session });
            }

            await Claim.deleteMany({}, { session });
            await Policy.deleteMany({}, { session });
            await PolicyToggleLog.deleteMany({}, { session });
            await SystemStatus.deleteMany({}, { session });
            await User.deleteMany({ email: { $nin: [KEEP_LOGINS.admin, KEEP_LOGINS.worker] } }, { session });

            const now = new Date();
            const startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
            const endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

            const policy = await Policy.create([{
                workerId: String(worker._id),
                startDate,
                endDate,
                premiumPaid: 315,
                coverageAmount: 4200,
                totalPremiumCollected: 315,
                totalClaimsPaid: 245,
                lossRatio: 245 / 315,
                payoutMultiplier: 3,
                coveredEvents: ['HEAVY_RAIN', 'HEATWAVE', 'PLATFORM_OUTAGE', 'AQI_SEVERE'],
                exclusions: ['INACTIVE_WORKER', 'GPS_MISMATCH', 'ALREADY_COMPENSATED', 'FRAUD_FLAGGED', 'DEVICE_ANOMALY'],
                maxPayoutPerEvent: 650,
                waitingPeriod: 24,
                activeHoursRequired: 4,
                shiftState: 'ON',
                lastToggledAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                toggleCount: 6,
                status: 'active',
                createdAt: startDate
            }], { session }).then((docs) => docs[0]);

            const toggleLogs = [
                {
                    workerId: String(worker._id),
                    previousState: 'OFF',
                    currentState: 'ON',
                    reason: 'morning_shift_started',
                    source: 'web_app',
                    createdAt: new Date(now.getTime() - 36 * 60 * 60 * 1000)
                },
                {
                    workerId: String(worker._id),
                    previousState: 'ON',
                    currentState: 'OFF',
                    reason: 'lunch_break',
                    source: 'web_app',
                    createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000)
                },
                {
                    workerId: String(worker._id),
                    previousState: 'OFF',
                    currentState: 'ON',
                    reason: 'evening_shift_started',
                    source: 'web_app',
                    createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000)
                },
                {
                    workerId: String(worker._id),
                    previousState: 'ON',
                    currentState: 'OFF',
                    reason: 'shift_completed',
                    source: 'web_app',
                    createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000)
                },
                {
                    workerId: String(worker._id),
                    previousState: 'OFF',
                    currentState: 'ON',
                    reason: 'peak_hours_started',
                    source: 'web_app',
                    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
                }
            ];

            await PolicyToggleLog.insertMany(toggleLogs, { session });

            const claims = [
                {
                    workerId: String(worker._id),
                    policyId: policy._id,
                    trigger: 'HEAVY_RAIN',
                    amount: 245,
                    trustScore: 93,
                    status: 'APPROVED',
                    payout: 245,
                    reputationScore: worker.reputationScore,
                    reasons: [
                        'IMD rainfall alert matched the active shift window',
                        'Route slowdown pattern matched historical delivery downtime',
                        'Claim history remained within normal frequency for the worker'
                    ],
                    source: 'zero_touch_scan',
                    automated: true,
                    reviewedBy: null,
                    reviewedAt: null,
                    resolutionNote: 'Payout of Rs.245 processed successfully via UPI',
                    transactionId: 'rzp_demo_rain_245',
                    payoutStatus: 'COMPLETED',
                    payoutProcessedAt: new Date(now.getTime() - 42 * 60 * 60 * 1000),
                    payoutMethod: 'UPI',
                    location: {
                        zone: 'Delhi NCR',
                        coordinates: { lat: 28.6139, lng: 77.2090 },
                        accuracy: 18,
                        timestamp: new Date(now.getTime() - 42 * 60 * 60 * 1000)
                    },
                    deviceInfo: {
                        ipAddress: '49.36.112.41',
                        userAgent: 'Mozilla/5.0',
                        deviceId: 'device_delhi_worker'
                    },
                    externalData: {
                        severityScore: 0.81,
                        baseProbability: 0.17,
                        eventType: 'HEAVY_RAIN',
                        zone: 'Delhi NCR'
                    },
                    triggerSnapshot: {
                        type: 'HEAVY_RAIN',
                        label: 'Heavy rain disruption',
                        severityScore: 0.81,
                        lossAmount: 245
                    },
                    createdAt: new Date(now.getTime() - 42 * 60 * 60 * 1000)
                },
                {
                    workerId: String(worker._id),
                    policyId: policy._id,
                    trigger: 'TRAFFIC_SURGE',
                    amount: 180,
                    trustScore: 47,
                    status: 'REJECTED',
                    payout: 0,
                    reputationScore: worker.reputationScore,
                    reasons: [
                        'Traffic surge stayed below the minimum policy severity threshold',
                        'Estimated income impact was lower than payable event rules'
                    ],
                    source: 'manual_trigger',
                    automated: false,
                    resolutionNote: 'Claim rejected by policy severity rules',
                    payoutStatus: 'NOT_APPLICABLE',
                    location: {
                        zone: 'Delhi NCR',
                        coordinates: { lat: 28.6200, lng: 77.2300 },
                        accuracy: 22,
                        timestamp: new Date(now.getTime() - 26 * 60 * 60 * 1000)
                    },
                    deviceInfo: {
                        ipAddress: '49.36.112.41',
                        userAgent: 'Mozilla/5.0',
                        deviceId: 'device_delhi_worker'
                    },
                    externalData: {
                        severityScore: 0.44,
                        baseProbability: 0.11,
                        eventType: 'TRAFFIC_SURGE',
                        zone: 'Delhi NCR'
                    },
                    createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000)
                },
                {
                    workerId: String(worker._id),
                    policyId: policy._id,
                    trigger: 'AQI_SEVERE',
                    amount: 320,
                    trustScore: 68,
                    status: 'VERIFY',
                    payout: 0,
                    reputationScore: worker.reputationScore,
                    reasons: [
                        'Air quality alert crossed the policy trigger threshold',
                        'Location accuracy dropped below preferred verification confidence',
                        'Manual review requested before payout release'
                    ],
                    source: 'manual_trigger',
                    automated: false,
                    resolutionNote: 'Waiting for admin review with additional GPS verification',
                    payoutStatus: 'PENDING',
                    location: {
                        zone: 'Delhi NCR',
                        coordinates: { lat: 28.6328, lng: 77.2197 },
                        accuracy: 86,
                        timestamp: new Date(now.getTime() - 90 * 60 * 1000)
                    },
                    deviceInfo: {
                        ipAddress: '49.36.112.41',
                        userAgent: 'Mozilla/5.0',
                        deviceId: 'device_delhi_worker'
                    },
                    externalData: {
                        severityScore: 0.77,
                        baseProbability: 0.21,
                        eventType: 'AQI_SEVERE',
                        zone: 'Delhi NCR'
                    },
                    triggerSnapshot: {
                        type: 'AQI_SEVERE',
                        label: 'Severe AQI disruption',
                        severityScore: 0.77,
                        lossAmount: 320
                    },
                    createdAt: new Date(now.getTime() - 90 * 60 * 1000)
                }
            ];

            await Claim.insertMany(claims, { session });
        });

        console.log('Realistic demo data reset completed successfully.');
        console.log('Kept login details for admin@gmail.com and user@gmail.com.');
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error('Realistic demo data reset failed:', error.message);
    process.exitCode = 1;
});
