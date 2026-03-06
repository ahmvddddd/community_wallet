const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { createDeposit, getDeposit, getDepositByToken, getGroupDeposits } = require('../../controllers/transaction/depositController');

router.post('/:group_id/init', createDeposit);
router.get('/:group_id/:public_read_token/read-token', getDeposit);
router.get('/by-token/:public_read_token', getDepositByToken);
router.get('/:group_id/group-deposits', ensureAuth, getGroupDeposits);

module.exports = router;