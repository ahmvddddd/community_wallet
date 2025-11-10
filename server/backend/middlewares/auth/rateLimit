const rateLimit = require('express-rate-limit');

exports.limitAuth = rateLimit({ windowMs: 10*60*1000, max: 50 });     // generic
exports.limitLogin = rateLimit({ windowMs: 10*60*1000, max: 10 });     // login
exports.limitRefresh = rateLimit({ windowMs: 10*60*1000, max: 30 });   // refresh