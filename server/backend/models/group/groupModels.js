const pool = require('../../db/db');
const { decryptFields } = require('../../utils/secureFields');
const { LEDGER_SECURE_FIELDS, USER_SECURE_FIELDS } = require('../../utils/secureFieldMaps');


exports.getBalance = async (groupId) => {
    const q = 'SELECT * FROM vw_group_balance WHERE group_id = $1';
    const result = await pool.query(q, [groupId]);
    return result.rows[0];
};

exports.getContributions = async (groupId) => {
    const q = 'SELECT * FROM vw_member_contributions WHERE group_id = $1';
    const result = await pool.query(q, [groupId]);
    return result.rows;
};

exports.insertGroup = async ({
    name,
    description,
    rule_template,
    approvals_required,
    approvals_cap,
    created_by
}) => {
    const created_at = new Date();

    const query = `
        INSERT INTO "group" (
        name,
        description,
        rule_template,
        approvals_required,
        approvals_cap,
        created_by,
        created_at
        ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
        ) RETURNING
        id, name, description, rule_template, approvals_required, approvals_cap, created_by, created_at
    `;

    const values = [
        name,
        description,
        rule_template,
        approvals_required,
        approvals_cap,
        created_by,
        created_at
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
}


exports.getMyGroups = async (userId) => {
  const q = `
    SELECT 
      gm.group_id,
      g.name AS group_name,
      gm.role_in_group,
      gm.joined_at
    FROM group_membership gm
    JOIN "group" g ON gm.group_id = g.id
    WHERE gm.user_id = $1
    ORDER BY gm.joined_at DESC
  `;

  const results = await pool.query(q, [userId]);
  return results.rows;
};


exports.groupSummary = async (groupId) => {
  const groupQ = `
    SELECT 
      id,
      name,
      description,
      approvals_required
    FROM "group"
    WHERE id = $1
  `;
  const groupRes = await pool.query(groupQ, [groupId]);
  if (groupRes.rows.length === 0) return null;

  const group = groupRes.rows[0];

  
  const balQ = `
    SELECT balance_kobo
    FROM vw_group_balance
    WHERE group_id = $1
  `;
  const balRes = await pool.query(balQ, [groupId]);
  const balance_kobo = balRes.rows.length ? balRes.rows[0].balance_kobo : 0;

  const memberQ = `SELECT COUNT(*) FROM group_membership WHERE group_id = $1`;
  const memberRes = await pool.query(memberQ, [groupId]);
  const member_count = Number(memberRes.rows[0].count);

  const depositQ = `SELECT COUNT(*) FROM deposits WHERE group_id = $1`;
  let deposit_count = 0;
  try {
    const depositRes = await pool.query(depositQ, [groupId]);
    deposit_count = Number(depositRes.rows[0].count);
  } catch (e) {
    deposit_count = 0;
  }

  const withdrawalQ = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
      COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_unpaid,
      COUNT(*) FILTER (WHERE status = 'PAID') AS paid
    FROM withdrawal_request
    WHERE group_id = $1
  `;
  const wdRes = await pool.query(withdrawalQ, [groupId]);
  const wd = wdRes.rows[0];

  return {
    group_id: group.id,
    name: group.name,
    description: group.description,
    approvals_required: group.approvals_required,

    balance_kobo,

    counts: {
      members: member_count,
      deposits: deposit_count,
      pending_withdrawals: Number(wd.pending),
      approved_unpaid: Number(wd.approved_unpaid),
      paid: Number(wd.paid),
    }
  };
};

exports.getLedgerEntries = async (groupId, page, pageSize) => {
  const offset = (page - 1) * pageSize;

  const query = `
    SELECT 
      le.id,
      le.group_id,
      le.account_id,
      le.user_id,
      le.type,
      le.amount_kobo,
      le.currency,
      le.source,
      le.reference,
      le.simulated,
      le.created_at,
      le.payment_channel,
      le.rule_status,
      le.client_ref
    FROM ledger_entry le
    WHERE le.group_id = $1
    ORDER BY le.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const { rows } = await pool.query(query, [groupId, pageSize, offset]);

  const decrypted = rows.map(row => {
    const dec = decryptFields(row, LEDGER_SECURE_FIELDS);

    if (dec.reference) {
      dec.reference_masked =
        dec.reference.substring(0, 4) + "****" + dec.reference.slice(-4);
    }

    return dec;
  });

  return decrypted;
};

exports.getLedgerEntryById = async (groupId, ledgerId) => {
  const query = `
    SELECT 
      le.id,
      le.group_id,
      g.name AS group_name,
      le.account_id,
      a.virtual_account_number,
      le.user_id,
      u.name AS user_name,
      u.email AS user_email,
      le.type,
      le.amount_kobo,
      le.currency,
      le.source,
      le.reference,
      le.simulated,
      le.created_at,
      le.payment_channel,
      le.rule_status,
      le.client_ref
    FROM ledger_entry le
    JOIN "group" g ON g.id = le.group_id
    LEFT JOIN account a ON a.id = le.account_id
    LEFT JOIN "user" u ON u.id = le.user_id
    WHERE le.id = $1 AND le.group_id = $2
  `;

  const { rows } = await pool.query(query, [ledgerId, groupId]);

  if (rows.length === 0) {
    return null;
  }

  // Decrypt ledger fields and user fields if encrypted
  let dec = decryptFields(rows[0], LEDGER_SECURE_FIELDS);
  dec = decryptFields(dec, USER_SECURE_FIELDS);

  if (dec.reference) {
    dec.reference_masked =
      dec.reference.substring(0, 4) + "****" + dec.reference.slice(-4);
  }

  return dec;
};

exports.getLedgerEntryCount = async (groupId) => {
  const q = `SELECT COUNT(*) FROM ledger_entry WHERE group_id = $1`;
  const { rows } = await pool.query(q, [groupId]);
  return parseInt(rows[0].count, 10);
};


exports.groupMembers = async (
  groupId,
  { limit = 50, offset = 0, q = null } = {}
) => {
  const values = [groupId];
  let idx = 2;

  let searchClause = "";
  if (q) {
    searchClause = `
      AND (
        LOWER(u.name) LIKE LOWER($${idx})
        OR LOWER(u.email) LIKE LOWER($${idx})
      )
    `;
    values.push(`%${q}%`);
    idx++;
  }

  const qText = `
    SELECT
      gm.user_id,
      u.name,
      u.email,
      gm.role_in_group,
      gm.joined_at
    FROM group_membership gm
    JOIN "user" u ON u.id = gm.user_id
    WHERE gm.group_id = $1
    ${searchClause}
    ORDER BY
      CASE gm.role_in_group
        WHEN 'OWNER' THEN 1
        WHEN 'TREASURER' THEN 2
        ELSE 3
      END,
      u.name ASC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  values.push(limit, offset);

  const res = await pool.query(qText, values);
  return res.rows.map((row) =>
    decryptFields(row, USER_SECURE_FIELDS)
  );
};

exports.groupMemberCount = async (groupId, q = null) => {
  const values = [groupId];
  let idx = 2;

  let searchClause = "";
  if (q) {
    searchClause = `
      AND (
        LOWER(u.name) LIKE LOWER($${idx})
        OR LOWER(u.email) LIKE LOWER($${idx})
      )
    `;
    values.push(`%${q}%`);
    idx++;
  }

  const qText = `
    SELECT COUNT(*)::int AS count
    FROM group_membership gm
    JOIN "user" u ON u.id = gm.user_id
    WHERE gm.group_id = $1
    ${searchClause}
  `;

  const res = await pool.query(qText, values);
  return res.rows[0]?.count ?? 0;
};


exports.getGroupDepositAccount = async (groupId) => {
  const q = `
    SELECT
      a.id,
      a.group_id,
      a.virtual_account_number,
      a.provider_ref,
      a.bank_name,
      a.created_at,
      g.name AS group_name
    FROM account a
    JOIN "group" g
      ON g.id = a.group_id
    WHERE a.group_id = $1
    LIMIT 1
  `;

  const res = await pool.query(q, [groupId]);

  if (res.rows.length === 0) {
    return null;
  }

  return res.rows[0];
};

exports.groupActivity = async (groupId, limit = 20) => {
  const q = `
    SELECT *
    FROM (
      SELECT
        d.id,
        'DEPOSIT' AS type,
        d.status,
        NULL::bigint AS amount_kobo,
        'Deposit received' AS title,
        CONCAT(d.bank_name, ' • ', d.account_number) AS subtitle,
        d.created_at
      FROM deposits d
      WHERE d.group_id = $1

      UNION ALL

      SELECT
        wr.id,
        'WITHDRAWAL' AS type,
        wr.status,
        wr.amount_kobo,
        CASE
          WHEN wr.status = 'PENDING' THEN 'Withdrawal requested'
          WHEN wr.status = 'APPROVED' THEN 'Withdrawal approved'
          WHEN wr.status = 'PAID' THEN 'Withdrawal paid'
          WHEN wr.status = 'DECLINED' THEN 'Withdrawal declined'
          ELSE 'Withdrawal update'
        END AS title,
        CASE
          WHEN wr.status = 'PENDING' THEN 'Waiting for approval'
          WHEN wr.status = 'APPROVED' THEN 'Approved, awaiting payment'
          WHEN wr.status = 'PAID' THEN 'Funds paid out'
          WHEN wr.status = 'DECLINED' THEN 'Request declined'
          ELSE 'Status updated'
        END AS subtitle,
        wr.created_at
      FROM withdrawal_request wr
      WHERE wr.group_id = $1
    ) activity
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const res = await pool.query(q, [groupId, limit]);

  if (res.rows.length === 0) {
    return [];
  }

  return res.rows;
};


exports.getGroupWithdrawals = async (groupId, page = 1, pageSize = 20) => {
  const offset = (page - 1) * pageSize;

  const query = `
    SELECT 
      wr.id,
      wr.group_id,
      wr.amount_kobo,
      wr.beneficiary,
      wr.reason,
      wr.status,
      wr.requested_by,
      u.name AS requester_name,
      u.email AS requester_email,
      wr.expires_at,
      wr.created_at
    FROM withdrawal_request wr
    JOIN "user" u ON u.id = wr.requested_by
    WHERE wr.group_id = $1
    ORDER BY wr.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const { rows } = await pool.query(query, [groupId, pageSize, offset]);

  return rows.map((row) => decryptFields(row, USER_SECURE_FIELDS));
};

exports.getGroupWithdrawalCount = async (groupId) => {
  const query = `
    SELECT COUNT(*)::int AS count 
    FROM withdrawal_request 
    WHERE group_id = $1
  `;
  const { rows } = await pool.query(query, [groupId]);
  return rows[0]?.count ?? 0;
};


exports.getGroupWithdrawalById = async (groupId, withdrawalId) => {
  const query = `
    SELECT 
      wr.id,
      wr.group_id,
      g.name AS group_name,
      wr.amount_kobo,
      wr.beneficiary,
      wr.reason,
      wr.status,
      wr.requested_by,
      u.name AS requester_name,
      u.email AS requester_email,
      g.approvals_required,
      wr.expires_at,
      wr.created_at
    FROM withdrawal_request wr
    JOIN "user" u ON u.id = wr.requested_by
    JOIN "group" g ON g.id = wr.group_id
    WHERE wr.id = $1 AND wr.group_id = $2
  `;

  const { rows } = await pool.query(query, [withdrawalId, groupId]);
  if (!rows.length) return null;

  return decryptFields(rows[0], USER_SECURE_FIELDS);
};

exports.getWithdrawalApprovalHistory = async (withdrawalId) => {
  const query = `
    SELECT 
      a.id AS approval_id,
      a.approver_user_id,
      u.name AS approver_name,
      u.email AS approver_email,
      a.created_at AS approved_at
    FROM approval a
    JOIN "user" u ON u.id = a.approver_user_id
    WHERE a.withdrawal_id = $1
    ORDER BY a.created_at ASC
  `;

  const { rows } = await pool.query(query, [withdrawalId]);
  return rows.map((row) => decryptFields(row, USER_SECURE_FIELDS));
};