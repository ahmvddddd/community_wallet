const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { createTransactionPin, validateTransactionPin, resetTransactionPin } = require('../../controllers/transaction/transactionPinController');

router.post('/create-pin', ensureAuth, createTransactionPin);
router.post('/validate-pin', ensureAuth, validateTransactionPin);
router.put('/reset-pin', ensureAuth, resetTransactionPin)

module.exports = router;