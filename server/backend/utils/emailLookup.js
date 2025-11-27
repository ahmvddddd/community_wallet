const crypto = require('crypto');

const EMAIL_LOOKUP_SECRET = process.env.EMAIL_LOOKUP_SECRET || 'dev-email-secret';

function computeEmailLookupHash(email) {
  const normalized = email.trim().toLowerCase();

  return crypto
    .createHmac('sha256', EMAIL_LOOKUP_SECRET)
    .update(normalized)
    .digest('hex');
}

module.exports = { computeEmailLookupHash };