const { encrypt, decrypt } = require('./cryptoHelper');

// Encrypt specified keys on a plain JS object
function encryptFields(obj, fields) {
  if (!obj) return obj;
  const clone = { ...obj };

  for (const key of fields) {
    const val = clone[key];
    if (val === undefined || val === null) continue;

    // JSON for objects, string for primitives
    const raw = typeof val === 'object' ? JSON.stringify(val) : String(val);
    clone[key] = encrypt(raw);
  }
  return clone;
}

// utils/secureFields.js (cont.)
function decryptFields(row, fields) {
  if (!row) return row;
  const clone = { ...row };

  for (const key of fields) {
    const val = clone[key];
    if (val === undefined || val === null) continue;

    try {
      const plain = decrypt(val);

      // Try JSON first, fall back to string
      try {
        clone[key] = JSON.parse(plain);
      } catch {
        clone[key] = plain;
      }
    } catch {
      // If decrypt fails, leave value as-is (logs will catch it)
      clone[key] = val;
    }
  }
  return clone;
}

module.exports = { encryptFields, decryptFields };