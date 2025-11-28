const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { withdrawalRequest, approveWithdrawal, rejectWithdrawal, groupWithdrawals } = require('../../controllers/transaction/withdrawalController');

router.post('/withdrawal-request', ensureAuth, withdrawalRequest);
router.post('/:withdrawal_id/approve', ensureAuth, approveWithdrawal);
router.post('/:withdrawal_id/reject', ensureAuth, rejectWithdrawal);
router.get('/:group_id/group-withdrawals', ensureAuth, groupWithdrawals)


module.exports = router;

