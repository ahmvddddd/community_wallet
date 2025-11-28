const pool = require('../../db/db');


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

  const depositQ = `SELECT COUNT(*) FROM deposit WHERE group_id = $1`;
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
