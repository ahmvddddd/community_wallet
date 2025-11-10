const express = require('express'); 
const router = express.Router();
const auth = require('../../controllers/auth/auth');
const { limitAuth, limitLogin, limitRefresh } = require('../../middlewares/auth/rateLimit');
const { validateRegister, validateLogin } = require('../../middlewares/auth/validator');
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');

router.post('/register', limitAuth, validateRegister, auth.register);
router.post('/login', limitLogin, validateLogin, auth.login);
router.post('/refresh', limitRefresh, auth.refresh);
router.post('/logout', auth.logout);
router.post('/logout-all', ensureAuth, auth.logoutAll);

module.exports = router;