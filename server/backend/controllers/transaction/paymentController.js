const { handlePaymentWebhook, generateClientRef } = require('../../utils/paymentHandler');

exports.simulateCheckout = async (req, res) => {
  try {
    const { group_id, user_id, account_id, amount, reference } = req.body;
    const client_ref = generateClientRef(group_id);

    const row = await handlePaymentWebhook({
      group_id, user_id, account_id, amount,
      reference: reference || 'checkout',
      client_ref, payment_channel: 'CHECKOUT',
      simulated: true, source: 'provider_sandbox',
    });

    res.status(201).json({ message: 'OK', ledgerEntry: row, client_ref });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};



exports.simulateVAWebhook = async (req, res) => {
  try {
    const { group_id, account_id, amount, client_ref, reference } = req.body;

    const row = await handlePaymentWebhook({
      group_id, account_id, amount,
      client_ref, reference: reference || 'va_deposit',
      payment_channel: 'VA', simulated: true, source: 'provider_sandbox'
    });

    res.status(201).json({ message: 'OK', ledgerEntry: row });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};