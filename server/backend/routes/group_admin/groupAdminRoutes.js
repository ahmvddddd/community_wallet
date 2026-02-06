const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { fetchDeposits, fetchWithdrawals } = require('../../controllers/group_admin/groupAdminController');

router.get('/all-deposits', ensureAuth, fetchDeposits);
router.get('/all-withdrawals', ensureAuth, fetchWithdrawals);
 
module.exports = router;