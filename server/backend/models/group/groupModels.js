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
