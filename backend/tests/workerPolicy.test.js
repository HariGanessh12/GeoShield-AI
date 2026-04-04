const express = require('express');
const request = require('supertest');

const workerId = '64b6c9f3a1b2c3d4e5f67890';

const mockState = {
    user: {
        _id: workerId,
        email: 'user@gmail.com',
        role: 'worker',
        zone: 'Delhi NCR',
        reputationScore: 85
    },
    policy: {
        _id: 'policy-1',
        workerId,
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2026-04-08T00:00:00.000Z'),
        premiumPaid: 120,
        coverageAmount: 3500,
        status: 'active',
        shiftState: 'OFF',
        toggleCount: 0,
        save: jest.fn(async function savePolicy() {
            mockState.policy = { ...mockState.policy, ...this };
            return mockState.policy;
        })
    },
    toggles: []
};

function resetState() {
    mockState.policy = {
        _id: 'policy-1',
        workerId,
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2026-04-08T00:00:00.000Z'),
        premiumPaid: 120,
        coverageAmount: 3500,
        status: 'active',
        shiftState: 'OFF',
        toggleCount: 0,
        save: jest.fn(async function savePolicy() {
            mockState.policy = { ...mockState.policy, ...this };
            return mockState.policy;
        })
    };
    mockState.toggles = [];
}

function envelope(res) {
    return {
        success: res.body.success,
        data: res.body.data,
        error: res.body.error,
        timestamp: res.body.timestamp
    };
}

function mockSortHelper(items, comparator) {
    return [...items].sort(comparator);
}

jest.mock('../models/user', () => ({
    findById: jest.fn(() => ({
        lean: jest.fn(async () => mockState.user)
    }))
}));

jest.mock('../models/policy', () => ({
    findOne: jest.fn(() => ({
            sort: jest.fn(() => Promise.resolve(mockState.policy))
    })),
    create: jest.fn(async (doc) => {
        mockState.policy = {
            ...doc,
            _id: 'policy-1',
            save: mockState.policy.save
        };
        return mockState.policy;
    })
}));

jest.mock('../models/policyToggleLog', () => ({
    findOne: jest.fn(() => ({
            sort: jest.fn(() => Promise.resolve(mockState.toggles[0] || null))
    })),
    find: jest.fn(() => ({
        sort: jest.fn(() => ({
            limit: jest.fn(() => ({
                lean: jest.fn(async () => mockSortHelper(mockState.toggles, (a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
                }))
        }))
    })),
    create: jest.fn(async (doc) => {
        const log = {
            ...doc,
            _id: `toggle-${mockState.toggles.length + 1}`,
            createdAt: new Date()
        };
        mockState.toggles.unshift(log);
        return log;
    })
}));

jest.mock('../models/claim', () => ({
    find: jest.fn(() => ({
        sort: jest.fn(() => ({
            limit: jest.fn(() => ({
                lean: jest.fn(async () => [])
            }))
        }))
    }))
}));

jest.mock('../middleware/authMiddleware', () => ({
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                data: null,
                error: { message: 'Access denied. No token provided.' },
                timestamp: new Date().toISOString()
            });
        }

        req.user = { id: workerId, role: 'worker' };
        next();
    },
    verifyAdmin: (req, res, next) => {
        if (req.user?.role === 'admin') {
            return next();
        }

        return res.status(403).json({
            success: false,
            data: null,
            error: { message: 'Access denied. Admin privileges required.' },
            timestamp: new Date().toISOString()
        });
    }
}));

const workerRouter = require('../api/worker');

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/worker', require('../middleware/authMiddleware').verifyToken, workerRouter);
    return app;
}

describe('worker policy micro-policy routes', () => {
    let app;

    beforeEach(() => {
        resetState();
        app = buildApp();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // This covers the business case where a gig worker starts a shift and coverage must turn on immediately.
    it('toggles a worker policy from OFF to ON and records the state change', async () => {
        const response = await request(app)
            .post(`/api/worker/${workerId}/policy/toggle`)
            .set('Authorization', 'Bearer demo-token')
            .send({ state: 'ON', reason: 'shift_started' });

        expect(response.status).toBe(200);
        expect(envelope(response).success).toBe(true);
        expect(response.body.data.policy.shiftState).toBe('ON');
        expect(response.body.data.policy.toggleCount).toBe(1);
        expect(mockState.toggles).toHaveLength(1);
        expect(mockState.toggles[0]).toMatchObject({
            previousState: 'OFF',
            currentState: 'ON',
            reason: 'shift_started'
        });
    });

    // This covers the business case where the worker ends a shift and should stop paying for coverage until the next job starts.
    it('toggles a worker policy from ON to OFF and records the state change', async () => {
        mockState.policy.shiftState = 'ON';

        const response = await request(app)
            .post(`/api/worker/${workerId}/policy/toggle`)
            .set('Authorization', 'Bearer demo-token')
            .send({ state: 'OFF', reason: 'shift_ended' });

        expect(response.status).toBe(200);
        expect(envelope(response).success).toBe(true);
        expect(response.body.data.policy.shiftState).toBe('OFF');
        expect(response.body.data.policy.toggleCount).toBe(1);
        expect(mockState.toggles).toHaveLength(1);
        expect(mockState.toggles[0]).toMatchObject({
            previousState: 'ON',
            currentState: 'OFF',
            reason: 'shift_ended'
        });
    });

    // This covers the business case where the product team needs a traceable audit trail of when the worker switched coverage on and off.
    it('returns policy history with logged toggle events', async () => {
        mockState.toggles = [
            {
                _id: 'toggle-1',
                workerId,
                previousState: 'OFF',
                currentState: 'ON',
                reason: 'shift_started',
                source: 'web_app',
                createdAt: new Date('2026-04-04T04:00:00.000Z')
            },
            {
                _id: 'toggle-2',
                workerId,
                previousState: 'ON',
                currentState: 'OFF',
                reason: 'shift_ended',
                source: 'web_app',
                createdAt: new Date('2026-04-04T05:00:00.000Z')
            }
        ];
        mockState.policy.shiftState = 'OFF';

        const response = await request(app)
            .get(`/api/worker/${workerId}/policy/history`)
            .set('Authorization', 'Bearer demo-token');

        expect(response.status).toBe(200);
        expect(envelope(response).success).toBe(true);
        expect(response.body.data.toggleCount).toBe(2);
        expect(response.body.data.history).toHaveLength(2);
        expect(response.body.data.history[0]).toMatchObject({ currentState: 'OFF', reason: 'shift_ended' });
        expect(response.body.data.history[1]).toMatchObject({ currentState: 'ON', reason: 'shift_started' });
    });

    // This covers the business case where someone tries to hit protected worker controls without a valid session.
    it('returns a 401 standard error envelope when the request is unauthorized', async () => {
        const response = await request(app).get(`/api/worker/${workerId}/summary`);

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
            success: false,
            data: null,
            error: { message: 'Access denied. No token provided.' }
        });
        expect(typeof response.body.timestamp).toBe('string');
    });
});
