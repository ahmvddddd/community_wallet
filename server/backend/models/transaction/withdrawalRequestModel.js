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

exports.executeWithdrawalTransaction = async (client, withdrawal) => {
    const { id, group_id, amount, requested_by } = withdrawal;

    const debitQuery = `
        INSERT INTO ledger_entry (group_id, account_id, type, amount, description)
        VALUES ($1, $2, 'DEBIT', $3, 'Withdrawal request approved: ' || $4)
        RETURNING *;
    `;
    const debitValues = [group_id, requested_by, amount, id];
    const debitResult = await client.query(debitQuery, debitValues);

    const updateQuery = `
        UPDATE withdrawal_request
        SET status = 'APPROVED', executed_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *;
    `;
    const updateResult = await client.query(updateQuery, [id]);

    return {
        withdrawal: updateResult.rows[0],
        debitEntry: debitResult.rows[0]
    };
};