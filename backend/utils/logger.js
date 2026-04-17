function baseEntry(level, event, context = {}) {
    return {
        timestamp: new Date().toISOString(),
        level,
        event,
        ...context
    };
}

function log(level, event, context = {}) {
    const entry = baseEntry(level, event, context);
    const serialized = JSON.stringify(entry);
    if (level === 'error') {
        console.error(serialized);
        return;
    }
    if (level === 'warn') {
        console.warn(serialized);
        return;
    }
    console.log(serialized);
}

function serializeError(error) {
    if (!error) return null;
    return {
        message: error.message,
        name: error.name,
        stack: error.stack
    };
}

module.exports = {
    logInfo: (event, context) => log('info', event, context),
    logWarn: (event, context) => log('warn', event, context),
    logError: (event, error, context = {}) => log('error', event, { ...context, error: serializeError(error) }),
    serializeError
};
