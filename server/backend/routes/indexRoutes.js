const express = require('express');
const router = express.Router();

const groupRoutes = require('./group/groupRoutes');
const authRoutes = require('./auth/authRoutes');
const paymentRoutes = require('./transaction/paymentRoutes');

router.use('/groups', groupRoutes);
router.use('/auth', authRoutes);
router.use('/transactions', paymentRoutes);

module.exports = router;