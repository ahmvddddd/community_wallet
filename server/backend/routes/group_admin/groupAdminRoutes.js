const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { fetchDeposits } = require('../../controllers/group_admin/groupAdminController');

router.get('/all-deposits', ensureAuth, fetchDeposits);
 
module.exports = router;