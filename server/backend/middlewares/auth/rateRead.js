const rateLimit = require('express-rate-limit');
module.exports = rateLimit({ windowMs: 60_000, max: 60 });