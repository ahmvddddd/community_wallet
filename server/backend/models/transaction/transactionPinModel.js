const pool = require('../../db/db');

exports.insertTransactionPin = async ({ userId, pinHash, recoveryTokenHash }) => {
    const q = `
        INSERT INTO transaction_pins 
        (user_id, pin_hash, recovery_token_hash)
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const values = [userId, pinHash, recoveryTokenHash];

    const result = await pool.query(q, values);
    return result.rows[0];
};


exports.getTransactionPinHashByUserId = async (userId) => {
    const q = 'SELECT pin_hash FROM transaction_pins WHERE user_id = $1';

    const result = await pool.query(q, [userId]);

    return result.rowCount ? result.rows[0].pin_hash : null;

};

exports.getRecoveryTokenHashByUserId = async (userId) => {

    const q = 'SELECT recovery_token_hash FROM transaction_pins WHERE user_id = $1';

    const result = await pool.query(q, [userId]);

    return result.rowCount ? result.rows[0].recovery_token_hash : null;

};

exports.updateTransactionPin = async ({ userId, newPinHash, newRecoveryTokenHash }) => {
    
    const q = `
        UPDATE transaction_pins
        SET pin_hash = $1,
            recovery_token_hash = $2
        WHERE user_id = $3
        RETURNING *
    `;

    const values = [newPinHash, newRecoveryTokenHash, userId];

    const result = await pool.query(q, values);

    return result.rowCount ? result.rows[0] : null;
    
};