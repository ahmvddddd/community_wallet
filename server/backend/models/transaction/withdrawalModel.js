const pool = require('../../db/db');
const { encryptFields, decryptFields } = require('../../utils/secureFields');
const { WITHDRAWAL_SECURE_FIELDS } = require('../../utils/secureFieldMaps');

exports.createWithdrawalRequest = async ({ groupId, amountKobo, beneficiary, requestedBy, reason }) => {

    const withdrawalData = {
        beneficiary: beneficiary,
        reason: reason
    };

    const secureWithdrawal = encryptFields(withdrawalData, WITHDRAWAL_SECURE_FIELDS);
    const status = 'PENDING';

    const q = `
    INSERT INTO withdrawal_request
    (group_id, amount_kobo, beneficiary, requested_by, status, reason)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`;

    const values = [
    groupId,
    amountKobo,
    JSON.stringify({ encrypted: secureWithdrawal.beneficiary }),
    requestedBy,
    status,
    JSON.stringify({ encrypted: secureWithdrawal.reason })
];

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
    return result.rows[0] || null;

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


exports.getGroupWithdrawals = async (groupId, { status, page, pageSize }) => {

    let values = [groupId];
    let where = `WHERE wr.group_id = $1`;

    if (status) {
        values.push(status);
        where += ` AND wr.status = $${values.length}`;
    }

    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);

    const q = `
        SELECT 
            wr.id,
            wr.group_id,
            wr.amount_kobo,
            wr.beneficiary,
            wr.reason,
            wr.status,
            wr.requested_by,
            wr.created_at,
            wr.executed_at,

            g.approvals_required,

            COALESCE(COUNT(a.id), 0) AS approvals_count

        FROM withdrawal_request wr
        JOIN "group" g ON wr.group_id = g.id
        LEFT JOIN approval a ON a.withdrawal_id = wr.id

        ${where}
        GROUP BY wr.id, g.approvals_required
        ORDER BY wr.created_at DESC

        LIMIT $${values.length - 1}
        OFFSET $${values.length}
    `;

    const result = await pool.query(q, values);

    const withdrawals = result.rows.map(row => {
        let beneficiaryName = null;
        let reasonText = null;

        let reasonEncrypted = null;

        if (row.reason) {
            try {
                
                const parsed = JSON.parse(row.reason);
                if (parsed?.encrypted) {
                    reasonEncrypted = parsed.encrypted;
                }
            } catch (_) {
            }
        }

        const enc = {
            beneficiary: row.beneficiary?.encrypted,
            reason: reasonEncrypted
        };

        try {
            const decrypted = decryptFields(enc, WITHDRAWAL_SECURE_FIELDS);

            if (decrypted.beneficiary && typeof decrypted.beneficiary === "object") {
                beneficiaryName = decrypted.beneficiary.name || null;
            }

            reasonText = decrypted.reason || null;

        } catch (e) {
            
            if (row.beneficiary && typeof row.beneficiary === "object") {
                beneficiaryName = row.beneficiary.name || null;
            }

            if (typeof row.reason === "string") {
                reasonText = row.reason;
            }
        }

        return {
            id: row.id,
            group_id: row.group_id,
            amount_kobo: row.amount_kobo,

            beneficiary_name: beneficiaryName,
            reason: reasonText,

            status: row.status,
            requested_by: row.requested_by,
            created_at: row.created_at,
            executed_at: row.executed_at,

            approvals_required: row.approvals_required,
            approvals_count: Number(row.approvals_count)
        };
    });


    const countValues = [groupId];
    let countWhere = `WHERE group_id = $1`;

    if (status) {
        countValues.push(status);
        countWhere += ` AND status = $${countValues.length}`;
    }

    const countQ = `
        SELECT COUNT(*) AS total
        FROM withdrawal_request
        ${countWhere}
    `;

    const countRes = await pool.query(countQ, countValues);

    return {
        withdrawals,
        total: Number(countRes.rows[0].total),
        page,
        pageSize,
        totalPages: Math.ceil(Number(countRes.rows[0].total) / pageSize)
    };
};


exports.getDetail = async (withdrawalId, userId) => {
    
    const q = `
        SELECT 
            wr.id,
            wr.group_id,
            wr.amount_kobo,
            wr.beneficiary,
            wr.reason,
            wr.status,
            wr.requested_by,
            wr.expires_at,
            wr.created_at,
            wr.executed_at,
            u.name AS requester_name
        FROM withdrawal_request wr
        JOIN "user" u ON u.id = wr.requested_by
        WHERE wr.id = $1
    `;

    const wrRes = await pool.query(q, [withdrawalId]);
    if (wrRes.rows.length === 0) return null;

    let withdrawal = wrRes.rows[0];

    const memQ = `
        SELECT 1
        FROM group_membership
        WHERE group_id = $1 AND user_id = $2
        LIMIT 1
    `;
    const memRes = await pool.query(memQ, [withdrawal.group_id, userId]);

    if (memRes.rows.length === 0) {
        
        return { unauthorized: true };
    }

    let reasonEncrypted = null;

    if (withdrawal.reason) {
        try {
            const parsed = JSON.parse(withdrawal.reason);
            if (parsed?.encrypted) reasonEncrypted = parsed.encrypted;
        } catch (_) {}
    }

    const enc = {
        beneficiary: withdrawal.beneficiary?.encrypted,
        reason: reasonEncrypted
    };

    let decrypted;
    try {
        decrypted = decryptFields(enc, WITHDRAWAL_SECURE_FIELDS);
    } catch (e) {
        decrypted = {};
    }

    withdrawal.beneficiary = {
        name: decrypted?.beneficiary?.name || null
    };

    withdrawal.reason = decrypted?.reason || null;

    const approvalQ = `
        SELECT 
            a.id,
            a.created_at,
            u.name AS approver_name,
            u.id   AS approver_user_id
        FROM approval a
        JOIN "user" u ON u.id = a.approver_user_id
        WHERE a.withdrawal_id = $1
        ORDER BY a.created_at ASC
    `;
    const approvalRes = await pool.query(approvalQ, [withdrawalId]);

    withdrawal.approvals = approvalRes.rows;

    return withdrawal;
};
