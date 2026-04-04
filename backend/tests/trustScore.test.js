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
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ network_risk_level: 'LOW', ring_count: 0 })
        });

        const workerProfile = { claims_history: [100, 100], reputation: 90 };
        const disruptionFactor = { type: 'HEAVY_RAIN', lossAmount: 200, location_mismatch: false };

        const result = await evaluateClaim("u1", disruptionFactor, workerProfile);

        expect(result.status).toBe('APPROVED');
        expect(result.trust_score).toBe(100); // Base 100, capped after reputation bonus
    });

    it('should penalize and flag VERIFY for GPS mismatch', async () => {
        // Mock the FastAPI Fraud Model response
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ is_anomaly: false, confidence: 0.90 })
        });
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ network_risk_level: 'LOW', ring_count: 0 })
        });

        const workerProfile = { claims_history: [100, 100], reputation: 75 };
        const disruptionFactor = { type: 'HEAVY_RAIN', lossAmount: 200, location_mismatch: true };

        const result = await evaluateClaim("u2", disruptionFactor, workerProfile);

        expect(result.trust_score).toBe(65); // 100 base - 35 mismatch
        expect(result.status).toBe('VERIFY');
        expect(result.adjustments.some(a => a.factor === "GPS Mismatch Penalty")).toBe(true);
    });

    it('should use a local fallback when the AI service is unavailable', async () => {
        fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const workerProfile = { claims_history: [100, 120], reputation: 85 };
        const disruptionFactor = { type: 'HEAVY_RAIN', lossAmount: 200, location_mismatch: false };

        const result = await evaluateClaim("u3", disruptionFactor, workerProfile);

        expect(result.status).toBe('VERIFY');
        expect(result.source).toBe('local_fallback');
        expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should approve a clean fallback claim when there is no prior history', async () => {
        fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const workerProfile = { claims_history: [], reputation: 85 };
        const disruptionFactor = { type: 'PLATFORM_OUTAGE', lossAmount: 400, location_mismatch: false };

        const result = await evaluateClaim("u4", disruptionFactor, workerProfile);

        expect(result.status).toBe('APPROVED');
        expect(result.trust_score).toBe(100);
        expect(result.source).toBe('local_fallback');
    });
});
