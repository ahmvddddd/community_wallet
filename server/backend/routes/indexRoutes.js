const express = require('express');
const router = express.Router();

const groupRoutes = require('./group/groupRoutes');
const authRoutes = require('./auth/authRoutes');
const paymentRoutes = require('./transaction/paymentRoutes');
const publicGroupRoutes = require('./group/publicGroupRoutes');
const shareRoutes = require('./group/shareRoutes');
const accountRoutes = require('./transaction/createAccountRoutes');
const transactionPinRoutes = require('./transaction/transactionPinRoutes');
const withdrawalRoutes = require('./transaction/withdrawalRoutes');
const payoutRoutes = require('./transaction/payoutRoutes');

router.use('/groups', groupRoutes);
router.use('/auth', authRoutes);
router.use('/transactions', paymentRoutes, transactionPinRoutes, withdrawalRoutes);
router.use('/public-group', publicGroupRoutes);
router.use('/share-routes', shareRoutes);
router.use('/account', accountRoutes);
router.use('/payout', payoutRoutes);

module.exports = router;

