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
