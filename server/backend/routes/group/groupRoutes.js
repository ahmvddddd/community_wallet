const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const group = require('../../controllers/group/groupController');

router.get('/:group_id/balance', group.getBalance);
router.get('/:group_id/contributions', group.getContributions);
router.post('/create-group', ensureAuth, group.createGroup);
router.get('/my-groups', ensureAuth, group.getAllMygroups);
router.get('/:group_id/group-summary', ensureAuth, group.groupSum);
router.get('/:group_id/ledger-snapshot', ensureAuth, group.getGroupLedger);

module.exports = router;
