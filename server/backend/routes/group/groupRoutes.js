const express = require('express');
const router = express.Router();
const group = require('../../controllers/group/groupController');

router.get('/:group_id/balance', group.getBalance);
router.get('/:group_id/contributions', group.getContributions);

module.exports = router;