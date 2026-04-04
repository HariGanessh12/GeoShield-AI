require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/user');
const Claim = require('../models/claim');
const Policy = require('../models/policy');

const KEEP_EMAILS = ['admin@gmail.com', 'user@gmail.com'];
const KEEP_ADMIN_ID = new mongoose.Types.ObjectId('64b6c9f3a1b2c3d4e5f67890');

async function run() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const admin = await User.findOne({ email: 'admin@gmail.com' });
    const user = await User.findOne({ email: 'user@gmail.com' });

    if (!admin) {
        throw new Error('admin@gmail.com does not exist in MongoDB');
    }

    if (!user) {
        throw new Error('user@gmail.com does not exist in MongoDB');
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const adminId = admin._id.toString();
            const userId = user._id.toString();

            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        email: 'user@gmail.com',
                        password: 'password',
                        role: 'worker'
                    }
                },
                { session }
            );

            if (adminId !== KEEP_ADMIN_ID.toString()) {
                const tempEmail = `admin-migrating-${Date.now()}@local`;
                const adminData = admin.toObject();
                delete adminData._id;
                delete adminData.__v;

                await User.updateOne(
                    { _id: admin._id },
                    { $set: { email: tempEmail, password: 'password', role: 'admin' } },
                    { session }
                );

                await User.create([{
                    ...adminData,
                    _id: KEEP_ADMIN_ID,
                    email: 'admin@gmail.com',
                    password: 'password',
                    role: 'admin'
                }], { session });

                await Claim.updateMany(
                    { workerId: adminId },
                    { $set: { workerId: KEEP_ADMIN_ID.toString() } },
                    { session }
                );

                await Policy.updateMany(
                    { workerId: adminId },
                    { $set: { workerId: KEEP_ADMIN_ID.toString() } },
                    { session }
                );

                await User.deleteOne({ _id: admin._id }, { session });
            } else {
                await User.updateOne(
                    { _id: admin._id },
                    {
                        $set: {
                            email: 'admin@gmail.com',
                            password: 'password',
                            role: 'admin'
                        }
                    },
                    { session }
                );
            }

            await Claim.deleteMany(
                { workerId: { $nin: [KEEP_ADMIN_ID.toString(), userId] } },
                { session }
            );

            await Policy.deleteMany(
                { workerId: { $nin: [KEEP_ADMIN_ID.toString(), userId] } },
                { session }
            );

            await User.deleteMany(
                { email: { $nin: KEEP_EMAILS } },
                { session }
            );
        });

        console.log('Account pruning completed successfully.');
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error('Account pruning failed:', error.message);
    process.exitCode = 1;
});
