const { createWithdrawalRequest, executeWithdrawalTransaction } = require('../../models/transaction/withdrawalRequestModel');
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
    pin: Joi.string().length(4).pattern(/^[0-9]+$/).required()
});

exports.confirmWithdrawal = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { error, value } = pinSchema.validate(req.body);

        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const withdrawalId = req.params.id;
        const userId = req.user.id;
        const { pin } = value;

        const withdrawalResult = await client.query(
            'SELECT * FROM withdrawal_request WHERE id = $1', 
            [withdrawalId]
        );
        
        const withdrawal = withdrawalResult.rows[0];

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal request not found.' });
        }
        
        if (withdrawal.status !== 'PENDING') {
            return res.status(409).json({ error: `Withdrawal status is ${withdrawal.status}. Only PENDING requests can be confirmed.` });
        }

        const memberCheck = await client.query(
            'SELECT user_id FROM group_membership WHERE user_id = $1 AND group_id = $2', 
            [userId, withdrawal.group_id]
        );
        
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You are not authorized to confirm this withdrawal.' });
        }

        const pinValid = await validateTransactionPin({ pin, userId });
        
        if (!pinValid) {
            return res.status(401).json({ error: 'Invalid transaction PIN.' });
        }

        await client.query('BEGIN');

        const balanceResult = await client.query(
            'SELECT balance_kobo FROM vw_group_balance WHERE group_id = $1', 
            [withdrawal.group_id]
        );
        
        const currentBalance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance_kobo : 0;
        
        if (currentBalance < withdrawal.amount) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Insufficient balance on final check. Transaction rolled back.' });
        }

        const { withdrawal: updatedWithdrawal, debitEntry } = 
            await executeWithdrawalTransaction(client, withdrawal);

        await client.query('COMMIT');
        
        return res.status(200).json({ 
            message: 'Withdrawal successfully executed.', 
            withdrawal: updatedWithdrawal,
            debitEntry
        });

    } catch (error) {
        await client.query('ROLLBACK').catch(e => console.error("Rollback error", e));
        
        console.error('Withdrawal Confirmation Error:', error);

        return res.status(500).json({ message: error.message });

    } finally {
        client.release();
    }
};