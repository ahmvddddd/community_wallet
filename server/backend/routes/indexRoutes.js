const express = require('express');
const router = express.Router();

const groupRoutes = require('./group/groupRoutes');

router.use('/groups', groupRoutes);

module.exports = router;