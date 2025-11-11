const express = require('express');
const router = express.Router();
const { simulateCheckout, simulateVAWebhook } = require('../../controllers/transaction/paymentController');

router.post('/simulate/checkout', simulateCheckout);
router.post('/simulate/va', simulateVAWebhook);

module.exports = router;
