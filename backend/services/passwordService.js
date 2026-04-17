const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function isBcryptHash(value) {
    return /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
}

async function hashPassword(password) {
    return bcrypt.hash(String(password), BCRYPT_ROUNDS);
}

async function comparePassword(password, hashedPassword) {
    if (!hashedPassword) return false;
    if (isBcryptHash(hashedPassword)) {
        return bcrypt.compare(String(password), hashedPassword);
    }
    const left = Buffer.from(String(password));
    const right = Buffer.from(String(hashedPassword));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

module.exports = {
    hashPassword,
    comparePassword,
    isBcryptHash
};
