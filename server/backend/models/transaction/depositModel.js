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


exports.fetchToken = async (publicReadToken, groupId) => {
    const q = `
    SELECT 
    public_read_token,
    group_name,
    account_name,
    bank_name,
    account_number,
    status,
    created_at,
    updated_at 
    FROM deposits
    WHERE public_read_token =$1
    AND group_id = $2
    `;

    const result = await pool.query(q, [publicReadToken, groupId]);
    return result.rows[0];
};


exports.fetchByToken = async (publicReadToken) => {
  const q = `
    SELECT 
      public_read_token,
      group_id,
      group_name,
      account_name,
      bank_name,
      account_number,
      status,
      created_at,
      updated_at
    FROM deposits
    WHERE public_read_token = $1
  `;
  const result = await pool.query(q, [publicReadToken]);
  return result.rows[0];
};


exports.getGroupDeposits = async ({
    groupId,
    search,
    status,
    bankName,
    accountNumber,
    startDate,
    endDate,
    limit,
    offset
}) => {

    let conditions = [`group_id = $1`];
    let values = [groupId];
    let index = 2;

    if (search) {
        conditions.push(`(
            account_name ILIKE $${index}
            OR bank_name ILIKE $${index}
            OR account_number ILIKE $${index}
            OR public_read_token ILIKE $${index}
        )`);
        values.push(`%${search}%`);
        index++;
    }

    if (status) {
        conditions.push(`status = $${index}`);
        values.push(status);
        index++;
    }

    if (bankName) {
        conditions.push(`bank_name ILIKE $${index}`);
        values.push(`%${bankName}%`);
        index++;
    }

    if (accountNumber) {
        conditions.push(`account_number ILIKE $${index}`);
        values.push(`%${accountNumber}%`);
        index++;
    }

    if (startDate) {
        conditions.push(`created_at >= $${index}`);
        values.push(startDate);
        index++;
    }

    if (endDate) {
        conditions.push(`created_at <= $${index}`);
        values.push(endDate);
        index++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const q = `
        SELECT
            id,
            public_read_token,
            group_id,
            group_name,
            account_name,
            bank_name,
            account_number,
            status,
            created_at,
            updated_at
        FROM deposits
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${index}
        OFFSET $${index + 1}
    `;

    values.push(limit);
    values.push(offset);

    const result = await pool.query(q, values);
    return result.rows;
};