const crypto = require('crypto');

exports.newRawRefresh = () => crypto.randomBytes(64).toString('base64url');
exports.hashRefresh = (raw) => crypto.createHash('sha256').update(raw).digest('hex');