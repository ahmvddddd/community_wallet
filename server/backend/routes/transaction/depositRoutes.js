const express = require('express');
const router = express.Router();
const { createDeposit, getDeposit, getDepositByToken } = require('../../controllers/transaction/depositController');

router.post('/:group_id/init', createDeposit);
router.get('/:group_id/:public_read_token/read-token', getDeposit);
router.get('/by-token/:public_read_token', getDepositByToken);

module.exports = router;