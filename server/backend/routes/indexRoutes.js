const express = require('express');
const router = express.Router();

const groupRoutes = require('./group/groupRoutes');
const authRoutes = require('./auth/authRoutes');
const paymentRoutes = require('./transaction/paymentRoutes');
const publicGroupRoutes = require('./group/publicGroupRoutes');
const shareRoutes = require('./group/shareRoutes');
const accountRoutes = require('./transaction/createAccountRoutes');

router.use('/groups', groupRoutes);
router.use('/auth', authRoutes);
router.use('/transactions', paymentRoutes);
router.use('/public-group', publicGroupRoutes);
router.use('/share-routes', shareRoutes);
router.use('/account', accountRoutes);

module.exports = router;