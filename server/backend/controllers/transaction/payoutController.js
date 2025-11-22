const pool = require('../../db/db');
const Joi = require('joi');
const { validateTransactionPin } = require('../../controllers/transaction/transactionPinController');
const { executePayout } = require('../../utils/payOutService');
const { recordPayoutAndHandleLedger } = require('../../models/transaction/payoutModel');

const pinSchema = Joi.object({
  pin: Joi.string().length(4).pattern(/^[0-9]+$/).required()
});

exports.executePayoutController = async (req, res) => {
  const client = await pool.connect();
  try {
    
    const { error, value } = pinSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const withdrawalId = req.params.withdrawal_id;
    const userId = req.user.id;
    const { pin } = value;

    await client.query('BEGIN');

    
    const withdrawalResult = await client.query(
      `SELECT wr.*, g.id AS group_id
       FROM withdrawal_request wr
       JOIN "group" g ON wr.group_id = g.id
       WHERE wr.id = $1
       FOR UPDATE`,
      [withdrawalId]
    );
    const withdrawal = withdrawalResult.rows[0];
    if (!withdrawal) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Withdrawal not found' }); }
    if (withdrawal.status !== 'APPROVED') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Withdrawal not APPROVED' }); }

    
    const allowedRoles = ['OWNER', 'TREASURER'];
    const roleCheck = await client.query(
      `SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 AND role_in_group = ANY($3::text[]) LIMIT 1`,
      [userId, withdrawal.group_id, allowedRoles]
    );
    if (roleCheck.rowCount === 0) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Not authorized' }); }

    
    const pinValid = await validateTransactionPin({ pin, userId });
    if (!pinValid) { await client.query('ROLLBACK'); return res.status(401).json({ error: 'Invalid PIN' }); }

    
    if (typeof withdrawal.amount_kobo !== 'number' || withdrawal.amount_kobo <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Invalid amount' }); }
    if (!withdrawal.beneficiary || !withdrawal.beneficiary.account_number) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Invalid beneficiary' }); }

    
    const payoutResult = await executePayout({
      amountKobo: withdrawal.amount_kobo,
      beneficiary: withdrawal.beneficiary,
      withdrawalId,
      groupId: withdrawal.group_id
    });

    
    const { withdrawalStatus, payout } = await recordPayoutAndHandleLedger(client, withdrawal, payoutResult, userId);

    await client.query('COMMIT');

    if (payoutResult.status === 'SUCCESS') {
      return res.status(200).json({
        status: 'ok',
        message: 'Payout executed successfully',
        withdrawal: { id: withdrawalId, status: withdrawalStatus },
        payout: { id: payout.id, provider: payout.provider, amount_kobo: payout.amount_kobo, created_at: payout.created_at }
      });
    } else {
      return res.status(502).json({ error: 'Payout provider failed', details: { provider: payout.provider, status: payout.status } });
    }

  } catch (err) {
    await client.query('ROLLBACK').catch(e => console.error('Rollback error', e));
    console.error('Payout error', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};
