// groupAdminController.js
const { checkUser, fetchDeposits, fetchWithdrawals } = require('../../models/group_admin/groupAdminModel');

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

exports.fetchWithdrawals = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const isAdmin = await checkUser(userId);
    if (!isAdmin) {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
      });
    }

    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const withdrawals = await fetchWithdrawals(userId, { limit, offset });

    return res.status(200).json({
      success: true,
      data: withdrawals.rows,
      pagination: {
        limit,
        offset,
        count: withdrawals.rowCount,
      },
    });
  } catch (err) {
    next(err);
  }
};


exports.adminCheck = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: 'Unauthorized: user not authenticated',
      });
    }

    const hasAdminRole = await checkUser(userId);

    if (!hasAdminRole) {
      return res.status(403).json({
        message: 'Access denied. Admin privileges required.',
      });
    }

    return res.status(200).json({
      isAdmin: true,
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};


