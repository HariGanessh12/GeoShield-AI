const { evaluateClaim } = require('../services/trustScore');

// Mock Node fetch globally since Node 18+ uses native fetch
global.fetch = jest.fn();

describe('trustScore Evaluation Engine', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    it('should return APPROVED for high trust score with no anomalies', async () => {
        // Mock the FastAPI Fraud Model response
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_anomaly: false, confidence: 0.95 })
        });

        const workerProfile = { claims_history: [100, 100], reputation: 90 };
        const disruptionFactor = { type: 'HEAVY_RAIN', lossAmount: 200, location_mismatch: false };

        const result = await evaluateClaim("u1", disruptionFactor, workerProfile);

        expect(result.status).toBe('APPROVED');
        expect(result.trust_score).toBe(110); // Base 100 + 10 reputation
    });

    it('should penalize and flag VERIFY for GPS mismatch', async () => {
        // Mock the FastAPI Fraud Model response
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_anomaly: false, confidence: 0.90 })
        });

        const workerProfile = { claims_history: [100, 100], reputation: 75 };
        const disruptionFactor = { type: 'HEAVY_RAIN', lossAmount: 200, location_mismatch: true };

        const result = await evaluateClaim("u2", disruptionFactor, workerProfile);

        expect(result.trust_score).toBe(65); // 100 base - 35 mismatch
        expect(result.status).toBe('VERIFY');
        expect(result.adjustments.some(a => a.factor === "GPS Mismatch Penalty")).toBe(true);
    });
});
