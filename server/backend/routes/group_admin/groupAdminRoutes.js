const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { fetchDeposits, fetchWithdrawals, adminCheck } = require('../../controllers/group_admin/groupAdminController');

router.get('/all-deposits', ensureAuth, fetchDeposits);
router.get('/all-withdrawals', ensureAuth, fetchWithdrawals);
router.get('/check-admin', ensureAuth, adminCheck);
 
module.exports = router;