const router = require('express').Router();
const { ensureAuth } = require('../../middlewares/auth/ensureAuth');
const limitRead = require('../../middlewares/auth/rateRead');
const share = require('../../controllers/group/shareController');


router.post('/:group_id/share/enable', limitRead,  ensureAuth, share.enableOrRotate);
router.post('/:group_id/share/disable', limitRead, ensureAuth, share.disable);

module.exports = router;