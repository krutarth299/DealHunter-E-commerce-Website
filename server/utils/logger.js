/**
 * Centralized logger for consistent server logs
 */

const formatMessage = (level, context, message, extra = null) => {
    const timestamp = new Date().toISOString();
    const extraStr = extra ? ` | ${JSON.stringify(extra)}` : '';
    return `[${timestamp}] [${level}] [${context}] ${message}${extraStr}`;
};

export const logger = {
    info: (context, message, extra) => {
        console.log(formatMessage('INFO', context, message, extra));
    },
    warn: (context, message, extra) => {
        console.warn(formatMessage('WARN', context, message, extra));
    },
    error: (context, message, extra) => {
        console.error(formatMessage('ERROR', context, message, extra));
    },
    debug: (context, message, extra) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatMessage('DEBUG', context, message, extra));
        }
    },
    price: (store, message, pricing) => {
        console.log(formatMessage('PRICE_DEBUG', store, message, pricing));
    },
    extraction: (store, status, url) => {
        console.log(formatMessage('EXTRACTOR', status, `URL: ${url}`));
    }
};

export default logger;
