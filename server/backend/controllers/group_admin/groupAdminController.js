// groupAdminController.js
const { checkUser, fetchDeposits } = require('../../models/group_admin/groupAdminModel');

exports.fetchDeposits = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const isAdmin = await checkUser(userId);

    if (!isAdmin) {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
      });
    }

    const deposits = await fetchDeposits(userId);

    return res.status(200).json({
      success: true,
      data: deposits.rows,
    });
  } catch (err) {
    next(err);
  }
};
