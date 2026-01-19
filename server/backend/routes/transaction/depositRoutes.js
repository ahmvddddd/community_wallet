const express = require('express');
const router = express.Router();
const { createDeposit, getDeposit } = require('../../controllers/transaction/depositController');

router.post('/:group_id/init', createDeposit);
router.get('/:public_read_token/read-token', getDeposit);

module.exports = router;