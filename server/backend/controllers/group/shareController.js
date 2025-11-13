const pool = require('../../db/db');
const { newShareToken } = require('../../utils/shareToken');

exports.enableOrRotate = async (req, res) => {
  const { group_id } = req.params;
  
  const role = await pool.query(
    `SELECT role_in_group FROM group_membership WHERE group_id=$1 AND user_id=$2`,
    [group_id, req.user.id]
  );
  if (role.rowCount === 0 || !['OWNER','TREASURER'].includes(role.rows[0].role_in_group))
    return res.status(403).json({ error: 'Forbidden' });

  const token = newShareToken();
  await pool.query(`UPDATE "group" SET public_read_token=$1 WHERE id=$2`, [token, group_id]);
  return res.json({ group_id, public_read_token: token });
};

exports.disable = async (req, res) => {
  const { group_id } = req.params;
  await pool.query(`UPDATE "group" SET public_read_token=NULL WHERE id=$1`, [group_id]);
  return res.json({ group_id, disabled: true });
};