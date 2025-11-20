const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { withdrawalRequest, approveWithdrawal, rejectWithdrawal } = require('../../controllers/transaction/withdrawalController');

router.post('/withrawal-request', ensureAuth, withdrawalRequest);
router.post('/:withdrawal_id/approve', ensureAuth, approveWithdrawal);
router.post('/:withdrawal_id/reject', ensureAuth, rejectWithdrawal);

module.exports = router;