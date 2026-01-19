const pool = require('../../db/db');

exports.getGroup = async (groupId) => {
    const q = `
    SELECT name FROM "group"
    WHERE id = $1
    `;
    
    const result = await pool.query(q, [groupId]);
    return result.rows[0];
};

exports.insertDeposit = async (
    publicReadToken,
    groupId,
    groupName,
    accountId,
    accountNumber,
    accountName,
    bankName,
    ledgerEntryId
) => {
    const q = `
        INSERT INTO deposits (
            public_read_token,
            group_id,
            group_name,
            account_id,
            account_number,
            account_name,
            bank_name,
            status,
            ledger_entry_id
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, 'PENDING', $8
        )
        RETURNING id, public_read_token;
    `;

    const values = [
        publicReadToken,
        groupId,
        groupName,
        accountId,
        accountNumber,
        accountName,
        bankName,
        ledgerEntryId
    ];

    const result = await pool.query(q, values);
    return result.rows[0];
};


exports.fetchToken = async (publicReadToken) => {
    const q =`
    SELECT * FROM deposits
    WHERE public_read_token =$1
    `;

    const result = await pool.query(q, [publicReadToken]);
    return result.rows[0];
};