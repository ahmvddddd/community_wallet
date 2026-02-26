const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { withdrawalRequest, approveWithdrawal, declineWithdrawal, groupWithdrawals, getWithdrawalDetails } = require('../../controllers/transaction/withdrawalController');

router.post('/withdrawal-request', ensureAuth, withdrawalRequest);
router.patch('/:withdrawal_id/approve', ensureAuth, approveWithdrawal);
router.patch('/:withdrawal_id/decline', ensureAuth, declineWithdrawal);
router.get('/:group_id/group-withdrawals', ensureAuth, groupWithdrawals);
router.get('/:withdrawal_id/withdrawal-details', ensureAuth, getWithdrawalDetails);


module.exports = router;

