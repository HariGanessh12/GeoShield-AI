function timestamp() {
    return new Date().toISOString();
}

function sendSuccess(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        error: null,
        timestamp: timestamp()
    });
}

function sendError(res, statusCode, message, details = null) {
    return res.status(statusCode).json({
        success: false,
        data: null,
        error: {
            message,
            details
        },
        timestamp: timestamp()
    });
}

module.exports = { sendSuccess, sendError, timestamp };
