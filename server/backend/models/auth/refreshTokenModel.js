const { encryptFields, decryptFields } = require('../../utils/secureFields');
const { REFRESH_TOKENS_SECURE_FIELDS } = require('../../utils/secureFieldMaps');


exports.insertToken = async (client, userId, tokenHash, plainIp, plainDevice, expiresAt) => {

  const rawData = {
    ip_address: plainIp,
    device_info: plainDevice
  };

  
  const secured = encryptFields(rawData, REFRESH_TOKENS_SECURE_FIELDS);

  
  return client.query(
    `INSERT INTO refresh_tokens(user_id, token_hash, ip_address, device_info, expires_at) 
     VALUES($1, $2, $3, $4, $5) 
     RETURNING id`,
    [
      userId, 
      tokenHash, 
      secured.ip_address || null,
      secured.device_info || null,
      expiresAt
    ]
  );
};

exports.findTokenByHash = async (client, hash) => {
  const res = await client.query(
    `SELECT id, user_id, revoked, expires_at, ip_address, device_info 
     FROM refresh_tokens 
     WHERE token_hash = $1`,
    [hash]
  );

  if (res.rows.length > 0) {
    return { 
      ...res, 
      rows: [decryptFields(res.rows[0], REFRESH_TOKENS_SECURE_FIELDS)] 
    };
  }
  
  return res;
};

exports.revokeToken = async (client, newId, oldId) => {
  return client.query(
    'UPDATE refresh_tokens SET revoked=true, replaced_by=$1 WHERE id=$2', 
    [newId, oldId]
  );
};