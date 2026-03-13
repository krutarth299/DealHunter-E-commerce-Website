const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Auth system removed - bypass all checks
    req.user = { role: 'admin' };
    next();
};

const isAdmin = (req, res, next) => {
    // Auth system removed - bypass all checks
    next();
};

module.exports = { verifyToken, isAdmin };
