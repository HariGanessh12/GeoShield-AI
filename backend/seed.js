require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Claim = require('./models/claim');

const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, '../database/seed_data.json'), 'utf-8'));

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected. Seeding data...');
        
        await Claim.deleteMany({});
        console.log('Cleared existing remote claims.');

        for (const claim of seedData.claims_history) {
            await Claim.create({
                workerId: claim.workerId,
                disruptionType: claim.disruptionType,
                claimAmount: claim.claimAmount,
                status: claim.status,
                trustScore: 95,
                timestamp: new Date(claim.date)
            });
        }
        
        console.log('✅ Seed Data Inserted into your Cluster!');
        process.exit();
    })
    .catch(err => {
        console.error('Seed script failed:', err.message);
        process.exit(1);
    });
