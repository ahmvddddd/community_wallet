const { randomBytes } = require('crypto');
exports.newShareToken = () => randomBytes(24).toString('base64url');