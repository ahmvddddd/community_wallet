const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const { createStaticVirtualAccount } = require('../../controllers/transaction/createVirtualAccount');

router.post('/:group_id/create-account', ensureAuth, createStaticVirtualAccount);

module.exports = router;