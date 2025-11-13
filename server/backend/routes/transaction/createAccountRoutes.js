const express = require('express');
const router = express.Router();
const { createStaticVirtualAccount } = require('../../controllers/transaction/createVirtualAccount');

router.post('/create-account', createStaticVirtualAccount);

module.exports = router;