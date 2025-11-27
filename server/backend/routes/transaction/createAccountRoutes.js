const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { createStaticVirtualAccount } = require('../../controllers/transaction/createVirtualAccount');
const { createAccount } = require('../../controllers/account/accountController')

router.post('/:group_id/create-account', ensureAuth, createAccount);

module.exports = router;