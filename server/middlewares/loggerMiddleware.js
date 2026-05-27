import logger from '../utils/logger.js';

/**
 * Middleware to log each incoming request
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP', `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
};
