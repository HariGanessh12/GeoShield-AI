const mongoose = require('mongoose');

let zod;
try {
    zod = require('zod');
} catch (err) {
    try {
        zod = require('../../frontend/node_modules/zod');
    } catch (fallbackErr) {
        zod = null;
    }
}

const z = zod?.z || zod;

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isObjectId(value) {
    return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function isNumberLike(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function createValidator(rules) {
    return (req, res, next) => {
        const errors = [];

        for (const rule of rules) {
            const source = req[rule.source] || {};
            const value = source[rule.field];
            if (rule.check && typeof rule.check.safeParse === 'function') {
                const result = rule.check.safeParse(value);
                if (!result.success) {
                    errors.push({
                        field: rule.field,
                        message: result.error.issues[0]?.message || `${rule.field} is invalid`
                    });
                }
                continue;
            }

            const error = rule.check(value, req);
            if (error) {
                errors.push({ field: rule.field, message: error });
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    message: 'Validation failed',
                    details: errors
                },
                timestamp: new Date().toISOString()
            });
        }

        next();
    };
}

const validators = {
    nonEmptyString: (label) => {
        if (!z) return (value) => (isNonEmptyString(value) ? null : `${label} is required`);
        return z.string().trim().min(1, `${label} is required`);
    },
    objectId: (label) => {
        if (!z) return (value) => (isObjectId(value) ? null : `${label} must be a valid MongoDB ObjectId`);
        return z.string().refine((value) => mongoose.Types.ObjectId.isValid(String(value)), {
            message: `${label} must be a valid MongoDB ObjectId`
        });
    },
    optionalNumber: (label, min, max) => {
        if (!z) {
            return (value) => {
                if (value === undefined || value === null || value === '') return null;
                if (!isNumberLike(value)) return `${label} must be a number`;
                const numeric = Number(value);
                if (typeof min === 'number' && numeric < min) return `${label} must be at least ${min}`;
                if (typeof max === 'number' && numeric > max) return `${label} must be at most ${max}`;
                return null;
            };
        }

        let schema = z.preprocess((value) => {
            if (value === undefined || value === null || value === '') return undefined;
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : value;
        }, z.number({ invalid_type_error: `${label} must be a number` }));

        if (typeof min === 'number') {
            schema = schema.refine((value) => value >= min, { message: `${label} must be at least ${min}` });
        }
        if (typeof max === 'number') {
            schema = schema.refine((value) => value <= max, { message: `${label} must be at most ${max}` });
        }
        return schema.optional();
    },
    policyState: () => {
        if (!z) {
            return (value) => {
                const normalized = String(value || '').toUpperCase();
                if (value === undefined || value === null || value === '') return null;
                return ['ON', 'OFF'].includes(normalized) ? null : 'state must be ON or OFF';
            };
        }
        return z.preprocess((value) => {
            if (value === undefined || value === null || value === '') return undefined;
            return String(value).toUpperCase();
        }, z.enum(['ON', 'OFF']).optional());
    }
};

module.exports = {
    createValidator,
    validators,
    isNonEmptyString,
    isObjectId,
    isNumberLike
};
