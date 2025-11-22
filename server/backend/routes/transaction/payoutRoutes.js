const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { executePayoutController } = require('../../controllers/transaction/payoutController');


router.post('/:withdrawal_id/pay', ensureAuth, executePayoutController);

module.exports = router;