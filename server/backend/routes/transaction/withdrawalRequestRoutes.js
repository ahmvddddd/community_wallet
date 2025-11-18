const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { withdrawalRequest } = require('../../controllers/transaction/withdrawalRequestController');

router.post('/withrawal-request', ensureAuth, withdrawalRequest);

module.exports = router;