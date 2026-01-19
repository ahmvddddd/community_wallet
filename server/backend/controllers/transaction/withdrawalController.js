const { createWithdrawalRequest,
  getWithdrawalWithGroup,
  insertApproval,
  countApprovalsForWithdrawal,
  updateWithdrawalStatusToApproved,
  updateWithdrawalStatusToRejected,
  getGroupWithdrawals,
  getDetail } = require('../../models/transaction/withdrawalModel');
const { validateTransactionPin } = require('./transactionPinController');
const pool = require('../../db/db');
const Joi = require('joi');
// const uuidv4 = (...args) => import("uuid").then(mod => mod.v4(...args));


const withdrawalSchema = Joi.object({
  groupId: Joi.string().uuid().required(),
  amount: Joi.number().precision(2).positive().required(),
  beneficiary: Joi.object({
    name: Joi.string().trim().required(),
    bank_name: Joi.string().trim().required(),
    account_number: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
  }).required(),
  reason: Joi.string().max(255).allow(null, ''),
});

exports.withdrawalRequest = async (req, res) => {
  try {

    const { error, value } = withdrawalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { groupId, amount, beneficiary, reason } = value;


    const amountKobo = Math.round(amount * 100);
    if (amountKobo <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero after conversion' });
    }


    const memberResult = await pool.query(
      'SELECT user_id FROM group_membership WHERE user_id = $1 AND group_id = $2',
      [userId, groupId],
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not authorised to make withdrawal requests for this group',
      });
    }

    // 4) Get current balance from view
    const balanceResult = await pool.query(
      'SELECT balance_kobo FROM vw_group_balance WHERE group_id = $1',
      [groupId],
    );

    const currentBalance = balanceResult.rows.length > 0
      ? Number(balanceResult.rows[0].balance_kobo || 0)
      : 0;

    if (Number.isNaN(currentBalance)) {
      return res.status(500).json({ error: 'Balance value is invalid' });
    }

    if (currentBalance < amountKobo) {
      return res.status(409).json({ error: 'Insufficient balance' });
    }

    // 5) Create withdrawal request (PENDING)
    const withdrawal = await createWithdrawalRequest({
      groupId,
      amountKobo,
      beneficiary,
      reason,
      requestedBy: userId,
    });

    return res.status(201).json({
      message: 'Withdrawal request successfully created',
      withdrawal,
    });
  } catch (error) {
    console.error('Withdrawal Request Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred' });
  }
};


const pinSchema = Joi.object({
  pin: Joi.string().length(4).pattern(/^[0-9]+$/).optional()
});

exports.approveWithdrawal = async (req, res) => {

  const withdrawalId = req.params.withdrawal_id;
  const userId = req.user.id;

  try {
    const withdrawalData = await getWithdrawalWithGroup(withdrawalId);

    if (!withdrawalData) {
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const { group_id, status, approvals_required, requested_by } = withdrawalData;

    if (status !== 'PENDING') {
      return res.status(409).json({ error: `Withdrawal is no longer PENDING. Current status: ${status}` });
    }

    if (!requested_by) {
      return res.status(500).json({
        error: 'Withdrawal requester information is missing.'
      });
    }

    if (requested_by === userId) {
      return res.status(403).json({
        error: 'You cannot approve your own withdrawal.'
      });
    }


    const roles = ['OWNER', 'TREASURER'];

    const roleCheck = await pool.query(
      `SELECT role_in_group
      FROM group_membership
      WHERE user_id = $1
        AND group_id = $2
        AND role_in_group = ANY($3::text[])`,
      [userId, group_id, roles]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorised to approve this withdrawal (must be OWNER or TREASURER).' });
    }

    try {
      await insertApproval(withdrawalId, userId);
    } catch (dbError) {

      if (dbError.code === '23505') {
        return res.status(409).json({ error: 'You have already approved this withdrawal.' });
      }
      throw dbError;
    }

    let currentApprovals = await countApprovalsForWithdrawal(withdrawalId);
    let currentStatus = 'PENDING';

    if (currentApprovals >= approvals_required) {

      await updateWithdrawalStatusToApproved(withdrawalId);
      currentStatus = 'APPROVED';
    }

    return res.status(200).json({
      status: "ok",
      current_approvals: currentApprovals,
      approvals_required: approvals_required,
      withdrawal_status: currentStatus,
      message: currentStatus === 'APPROVED'
        ? 'Withdrawal has reached the required approvals and is now APPROVED.'
        : 'Approval recorded. Waiting for more admins.'
    });

  } catch (error) {
    console.error('Withdrawal Approval Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
};


// sets status to DECLINED (legacy naming)
exports.rejectWithdrawal = async (req, res) => {
  const withdrawalId = req.params.withdrawal_id;
  const userId = req.user.id;

  try {
    
    const withdrawalData = await getWithdrawalWithGroup(withdrawalId);

    if (!withdrawalData) {
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const { group_id, status, requested_by } = withdrawalData;

    if (status !== 'PENDING') {
      return res.status(409).json({ error: `Withdrawal is no longer PENDING. Current status: ${status}` });
    }

    if (!requested_by) {
      return res.status(500).json({
        error: 'Withdrawal requester information is missing.'
      });
    }

    if (requested_by === userId) {
      return res.status(403).json({
        error: 'You cannot reject your own withdrawal.'
      });
    }

    
    const roles = ['OWNER', 'TREASURER'];

    const roleCheck = await pool.query(
      `SELECT role_in_group
      FROM group_membership
      WHERE user_id = $1
        AND group_id = $2
        AND role_in_group = ANY($3::text[])`,
      [userId, group_id, roles]
    );


    if (roleCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not authorised to reject this withdrawal.' });
    }

    
    const rejected = await updateWithdrawalStatusToRejected(withdrawalId);

    return res.status(200).json({
      status: "ok",
      withdrawal_status: rejected.status,
      message: 'Withdrawal successfully marked as DECLINED.'
    });

  } catch (error) {
    console.error('Withdrawal Rejection Error:', error);
    return res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

exports.groupWithdrawals = async (req, res) => {
  try {
    const groupId = req.params.group_id;

    if (!groupId) {
      return res.status(400).json({ error: 'Missing group_id' });
    }

    const memberCheck = await pool.query(
      'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
      [req.user.id, groupId]
    );
    if (!memberCheck.rowCount) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    let { status, page, pageSize } = req.query;

    const allowedStatus = ['PENDING', 'APPROVED', 'DECLINED', 'PAID'];
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    page = parseInt(page) || 1;
    pageSize = parseInt(pageSize) || 10;

    if (pageSize > 50) pageSize = 50;

    const results = await getGroupWithdrawals(
      groupId,
      { status, page, pageSize }
    );

    return res.status(200).json(results);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


exports.getWithdrawalDetails = async (req, res) => {
  try {
    const withdrawalId = req.params.withdrawal_id;
    const userId = req.user.id;

    if (!withdrawalId) {
      return res.status(400).json({ error: "withdrawal_id is required" });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const detail = await getDetail(withdrawalId, userId);

    if (!detail) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    if (detail.unauthorized) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    return res.status(200).json({
      details: detail
    });

  } catch (error) {
    console.error("getWithdrawalDetail error:", error);
    return res.status(500).json({ message: error.message });
  }
};

