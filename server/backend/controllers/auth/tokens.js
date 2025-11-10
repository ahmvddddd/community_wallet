const jwt = require('jsonwebtoken');
const ACCESS_EXP = process.env.JWT_ACCESS_TTL || '15m';
const ALG = process.env.JWT_ALGO || 'HS256';

exports.signAccess = (p) => jwt.sign(p, process.env.JWT_ACCESS_SECRET, { algorithm: ALG, expiresIn: ACCESS_EXP });
exports.verifyAccess = (t) => jwt.verify(t, process.env.JWT_ACCESS_SECRET);