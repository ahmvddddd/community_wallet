const pool = require('../db/db');

let uuidv4;

(async () => {
  const { v4 } = await import('uuid');
  uuidv4 = v4;
})();

exports.generateClientRef = (groupId) => {
  return `${groupId}-${uuidv4().slice(0, 8)}`;
};

async function assertAccountInGroup(accountId, groupId) {
  const q = 'SELECT 1 FROM account WHERE id=$1 AND group_id=$2';
  const r = await pool.query(q, [accountId, groupId]);
  if (r.rowCount === 0) throw new Error('Account does not belong to group');
}

async function assertMembershipIfProvided(userId, groupId) {
  if (!userId) return; // VA path
  const q = 'SELECT 1 FROM group_membership WHERE user_id=$1 AND group_id=$2';
  const r = await pool.query(q, [userId, groupId]);
  if (r.rowCount === 0) throw new Error('User not a member of this group');
}

exports.handlePaymentWebhook = async (payload) => {
  const {
    group_id, account_id, amount,
    user_id = null,
    client_ref = null,
    reference = 'deposit',
    payment_channel = 'CHECKOUT',
    source = 'provider_sandbox',
    simulated = true,
  } = payload;

  if (!group_id || !account_id || !amount) throw new Error('Missing fields');
  await assertAccountInGroup(account_id, group_id);
  await assertMembershipIfProvided(user_id, group_id);

  const amount_kobo = Math.round(Number(amount) * 100);

  const sql = `
    INSERT INTO ledger_entry (
      group_id, user_id, account_id, type,
      amount_kobo, currency, source, reference,
      simulated, client_ref, payment_channel, rule_status
    )
    VALUES ($1,$2,$3,'CREDIT',$4,'NGN',$5,$6,$7,$8,$9,'VALID')
    ON CONFLICT (client_ref) DO NOTHING
    RETURNING *;
  `;
  const vals = [
    group_id, user_id, account_id,
    amount_kobo, source, reference,
    simulated, client_ref, payment_channel
  ];

  const r = await pool.query(sql, vals);
  if (r.rowCount === 0) {
    // idempotent repeat
    const get = 'SELECT * FROM ledger_entry WHERE client_ref=$1';
    return (await pool.query(get, [client_ref])).rows[0];
  }
  return r.rows[0];
};