const pool = require('../../db/db');

exports.createWithdrawalRequest = async ({ groupId, amountKobo, beneficiary, requestedBy, reason }) => {
    const status = 'PENDING';
    
    const q = `
    INSERT INTO withdrawal_request
    (group_id, amount_kobo, beneficiary, requested_by, status, reason)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`;

    const values = [groupId, amountKobo, beneficiary, requestedBy, status, reason];

    const result = await pool.query(q, values);
    return result.rows[0];
};


exports.getWithdrawalWithGroup = async (withdrawalId) => {
    const q = `
        SELECT 
            wr.id, 
            wr.group_id, 
            wr.status, 
            wr.amount_kobo, 
            g.approvals_required, 
            g.approvals_cap
        FROM withdrawal_request wr
        JOIN "group" g ON wr.group_id = g.id 
        WHERE wr.id = $1;
    `;
    const result = await pool.query(q, [withdrawalId]);
    return result.rows[0];
};


exports.insertApproval = async (withdrawalId, approverUserId) => {
    const q = `
        INSERT INTO approval (withdrawal_id, approver_user_id)
        VALUES ($1, $2)
        RETURNING *;
    `;
    
    const result = await pool.query(q, [withdrawalId, approverUserId]);
    return result.rows[0];
};


exports.countApprovalsForWithdrawal = async (withdrawalId) => {
    const q = `
        SELECT count(*)::int AS approval_count
        FROM approval
        WHERE withdrawal_id = $1;
    `;
    const result = await pool.query(q, [withdrawalId]);
    return result.rows[0] ? result.rows[0].approval_count : 0;
};


exports.updateWithdrawalStatusToApproved = async (withdrawalId) => {
    const q = `
        UPDATE withdrawal_request
        SET status = 'APPROVED'
        WHERE id = $1 AND status = 'PENDING'
        RETURNING id, group_id, status;
    `;
    const result = await pool.query(q, [withdrawalId]);
    return result.rows[0];
};


exports.updateWithdrawalStatusToRejected = async (withdrawalId) => {
    const q = `
        UPDATE withdrawal_request
        SET status = 'DECLINED'
        WHERE id = $1 AND status = 'PENDING'
        RETURNING id, group_id, status;
    `;
    const result = await pool.query(q, [withdrawalId]);
    return result.rows[0];
};