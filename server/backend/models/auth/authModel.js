const pool = require('../../db/db');
const argon2 = require('argon2');
const { encryptFields, decryptFields } = require('../../utils/secureFields');
const { computeEmailLookupHash } = require('../../utils/emailLookup');
const { USER_ACTIVITY_SECURE_FIELDS, USER_SECURE_FIELDS } = require('../../utils/secureFieldMaps'); 

exports.getClient = async () => {
  return pool.connect();
};

exports.audit = async (client, userId, event, plainIp, plainDevice) => {
  const auditData = {
    ip_address: plainIp,
    device_info: plainDevice
  };

  const secureAudit = encryptFields(auditData, USER_ACTIVITY_SECURE_FIELDS);

  return client.query(
    `INSERT INTO user_activity_log(user_id, event, ip_address, device_info)
     VALUES ($1, $2, $3, $4)`,
    [userId, event, secureAudit.ip_address, secureAudit.device_info]
  );
};

// Returns true if user exists (by email), false otherwise
exports.findUserByEmail = async (client, email) => {
  const normalized = email.toLowerCase();
  const lookupHash = computeEmailLookupHash(normalized);

  return client.query(
    'SELECT 1 FROM "user" WHERE email_lookup_hash = $1',
    [lookupHash]
  );
};

exports.getUserLoginData = async (client, email) => {
  const normalized = email.toLowerCase();
  const lookupHash = computeEmailLookupHash(normalized);

  const {rows} = await client.query(
    `SELECT id, password_hash
     FROM "user"
     WHERE email_lookup_hash = $1`,
    [lookupHash]
  );

  return rows[0] || null;
};


exports.createUser = async (client, email, password, name) => {
  const normalizedEmail = email.toLowerCase();

  const emailLookupHash = computeEmailLookupHash(normalizedEmail);

  const secureUser = encryptFields(
    { email: normalizedEmail },
    USER_SECURE_FIELDS
  );

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

  const res = await client.query(
    `INSERT INTO "user"(email, email_lookup_hash, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name`,
    [secureUser.email, emailLookupHash, passwordHash, name]
  );

  const userRow = res.rows[0];
  const decrypted = decryptFields(userRow, USER_SECURE_FIELDS);
  return decrypted;
};

exports.verifyPassword = async (hash, password) => {
  return argon2.verify(hash, password);
};