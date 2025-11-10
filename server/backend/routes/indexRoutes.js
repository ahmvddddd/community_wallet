const express = require('express');
const router = express.Router();

const groupRoutes = require('./group/groupRoutes');
const authRoutes = require('./auth/auth_routes');

router.use('/groups', groupRoutes);
router.use('/auth', authRoutes);

module.exports = router;