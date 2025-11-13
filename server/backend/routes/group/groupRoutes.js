const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const group = require('../../controllers/group/groupController');

router.get('/:group_id/balance', group.getBalance);
router.get('/:group_id/contributions', group.getContributions);
router.post('/create-group', ensureAuth, group.createGroup);

module.exports = router;