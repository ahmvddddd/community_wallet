// groupAdminModel.js
const pool = require('../../db/db');

exports.checkUser = async (user_id) => {
  const q = `
    SELECT 1
    FROM group_membership
    WHERE user_id = $1
      AND role_in_group IN ('OWNER', 'TREASURER')
    LIMIT 1
  `;

  const { rowCount } = await pool.query(q, [user_id]);
  return rowCount > 0;
};

exports.fetchDeposits = async (user_id) => {
  const q = `
    SELECT
      d.id,
      d.public_read_token,
      d.group_id,
      g.name AS group_name,
      d.account_id,
      d.account_number,
      d.account_name,
      d.bank_name,
      d.status,
      d.ledger_entry_id,
      d.created_at,
      d.updated_at
    FROM deposits d
    INNER JOIN "group" g
      ON g.id = d.group_id
    INNER JOIN group_membership gm
      ON gm.group_id = g.id
    WHERE
      gm.user_id = $1
      AND gm.role_in_group IN ('OWNER', 'TREASURER')
    ORDER BY d.created_at DESC
  `;

  return pool.query(q, [user_id]);
};

exports.fetchWithdrawals = async (user_id, { limit = 20, offset = 0 } = {}) => {
  const q = `
    SELECT
      wr.id,
      wr.group_id,
      g.name AS group_name,
      wr.amount_kobo,
      wr.beneficiary,
      wr.reason,
      wr.status,
      wr.requested_by,
      wr.expires_at,
      wr.created_at,
      wr.executed_at,
      wr.declined_by,
      wr.declined_at,
      wr.decline_reason
    FROM withdrawal_request wr
    INNER JOIN "group" g
      ON g.id = wr.group_id
    INNER JOIN group_membership gm
      ON gm.group_id = g.id
    WHERE
      gm.user_id = $1
      AND gm.role_in_group IN ('OWNER', 'TREASURER')
    ORDER BY wr.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  return pool.query(q, [user_id, limit, offset]);
};
