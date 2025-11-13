const router = require('express').Router();
const pool = require('../../db/db');
const limitRead = require('../../middlewares/auth/rateRead');
const group = require('../../controllers/group/groupController');

async function assertToken(req, res, next) {
  const { group_id } = req.params;
  const token = req.query.token || req.get('x-share-token');
  if (!token) return res.status(403).json({ error: 'Forbidden' });
  const ok = await pool.query(
    `SELECT 1 FROM "group" WHERE id=$1 AND public_read_token=$2`,
    [group_id, token]
  );
  if (ok.rowCount === 0) return res.status(403).json({ error: 'Forbidden' });
  return next();
}

router.get('/:group_id/balance', limitRead, assertToken, group.getBalance);
router.get('/:group_id/contributions', limitRead, assertToken, group.getContributions);

module.exports = router;