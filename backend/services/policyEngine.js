const Policy = require('../models/policy');
const PolicyToggleLog = require('../models/policyToggleLog');

const MONTH_HOURS = 720;
const FULL_COVERAGE_MONTHLY_COST = 120;
const AUTO_SHUTOFF_HOURS = 12;
const AUTO_SHUTOFF_REASON = 'auto-shutoff: exceeded 12hr continuous coverage limit';

function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function toDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function hoursBetween(start, end) {
    return Math.max(0, (end.getTime() - start.getTime()) / 3600000);
}

async function loadPolicyAndLogs(workerId, now = new Date()) {
    const policy = await Policy.findOne({ workerId }).sort({ createdAt: -1 });
    const latestLog = await PolicyToggleLog.findOne({ workerId }).sort({ createdAt: -1 });
    const logs = await PolicyToggleLog.find({ workerId }).sort({ createdAt: 1 }).lean();

    return {
        policy,
        latestLog,
        logs,
        currentState: latestLog?.currentState || policy?.shiftState || 'OFF',
        now
    };
}

async function checkAndApplyAutoShutoff(workerId, now = new Date()) {
    const state = await loadPolicyAndLogs(workerId, now);
    const latestTurnOn = state.currentState === 'ON' ? state.latestLog : null;

    if (!state.policy || state.currentState !== 'ON' || !latestTurnOn) {
        return { ...state, autoShutoffApplied: false };
    }

    const onSince = toDate(latestTurnOn.createdAt) || toDate(state.policy.lastToggledAt);
    if (!onSince) {
        return { ...state, autoShutoffApplied: false };
    }

    const continuousHours = hoursBetween(onSince, now);
    if (continuousHours <= AUTO_SHUTOFF_HOURS) {
        return { ...state, autoShutoffApplied: false };
    }

    state.policy.shiftState = 'OFF';
    state.policy.lastToggledAt = now;
    state.policy.toggleCount = (state.policy.toggleCount || 0) + 1;
    await state.policy.save();

    const autoLog = await PolicyToggleLog.create({
        workerId,
        previousState: 'ON',
        currentState: 'OFF',
        reason: AUTO_SHUTOFF_REASON,
        source: 'system'
    });

    return {
        ...state,
        latestLog: autoLog,
        currentState: 'OFF',
        autoShutoffApplied: true
    };
}

function calculateMonthlyPolicySummary(policyState, logs, now = new Date()) {
    const monthStart = startOfMonth(now);
    const monthLogs = logs
        .filter((log) => {
            const createdAt = toDate(log.createdAt);
            return createdAt && createdAt >= monthStart && createdAt <= now;
        })
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const previousLog = [...logs]
        .filter((log) => {
            const createdAt = toDate(log.createdAt);
            return createdAt && createdAt < monthStart;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

    let state = previousLog?.currentState || policyState.currentState || policyState.policy?.shiftState || 'OFF';
    let periodStart = monthStart;
    let activeMs = 0;

    if (state === 'ON') {
        periodStart = monthStart;
    }

    for (const log of monthLogs) {
        const logTime = toDate(log.createdAt);
        if (!logTime) continue;

        if (state === 'ON') {
            activeMs += Math.max(0, logTime.getTime() - periodStart.getTime());
        }

        state = log.currentState;
        periodStart = logTime;
    }

    if (state === 'ON') {
        activeMs += Math.max(0, now.getTime() - periodStart.getTime());
    }

    const activeCoverageHours = round2(activeMs / 3600000);
    const fullCoverageMonthlyCost = round2(FULL_COVERAGE_MONTHLY_COST);
    const estimatedMonthlySaving = round2(fullCoverageMonthlyCost - (fullCoverageMonthlyCost * (activeCoverageHours / MONTH_HOURS)));
    const microPolicyMonthlyCost = round2(fullCoverageMonthlyCost - estimatedMonthlySaving);
    const coverageEfficiencyPercent = Math.round((microPolicyMonthlyCost / fullCoverageMonthlyCost) * 100);

    return {
        activeCoverageHours,
        estimatedMonthlySaving,
        fullCoverageMonthlyCost,
        microPolicyMonthlyCost,
        coverageEfficiencyPercent
    };
}

async function buildPolicySummary(workerId, now = new Date()) {
    const state = await checkAndApplyAutoShutoff(workerId, now);
    const logs = await PolicyToggleLog.find({ workerId }).sort({ createdAt: 1 }).lean();
    const summary = calculateMonthlyPolicySummary(state, logs, now);

    return {
        ...summary,
        autoShutoffApplied: Boolean(state.autoShutoffApplied),
        currentState: state.currentState
    };
}

module.exports = {
    AUTO_SHUTOFF_REASON,
    AUTO_SHUTOFF_HOURS,
    MONTH_HOURS,
    FULL_COVERAGE_MONTHLY_COST,
    buildPolicySummary,
    calculateMonthlyPolicySummary,
    checkAndApplyAutoShutoff,
    loadPolicyAndLogs,
    round2
};
