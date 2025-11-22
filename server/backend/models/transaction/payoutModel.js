exports.recordPayoutAndHandleLedger = async (client, withdrawal, payoutResult, executedByUserId) => {
  const { id: withdrawalId, group_id, amount_kobo, beneficiary, status: withdrawalStatusOriginal } = withdrawal;
  const { status, providerResponse } = payoutResult;

  if (!withdrawalId) throw new Error('Missing withdrawal id');
  if (typeof amount_kobo !== 'number' || amount_kobo <= 0) throw new Error('Invalid withdrawal.amount_kobo');
  if (!beneficiary || !beneficiary.account_number) throw new Error('Invalid beneficiary');

  
  const existing = await client.query(
    `SELECT * FROM payout WHERE withdrawal_id = $1 AND status = 'SUCCESS' LIMIT 1`,
    [withdrawalId]
  );
  if (existing.rows.length > 0) {
    return { withdrawalStatus: 'PAID', payout: existing.rows[0] };
  }

  
  const payoutInsertQuery = `
    INSERT INTO payout (withdrawal_id, amount_kobo, beneficiary, provider, status, provider_payload, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *;
  `;
  const payoutValues = [
    withdrawalId,
    amount_kobo,
    JSON.stringify(beneficiary),
    providerResponse?.provider || 'mock_provider',
    status,
    JSON.stringify(providerResponse || {})
  ];
  const payoutInsert = await client.query(payoutInsertQuery, payoutValues);
  if (payoutInsert.rowCount !== 1) throw new Error('Failed to insert payout');

  const payoutRow = payoutInsert.rows[0];
  let finalWithdrawalStatus = withdrawalStatusOriginal;

  if (status === 'SUCCESS') {
    
    const updateWithdrawal = await client.query(
      `UPDATE withdrawal_request
       SET status = 'PAID', executed_at = NOW()
       WHERE id = $1 AND status = 'APPROVED'
       RETURNING status`,
      [withdrawalId]
    );
    if (updateWithdrawal.rowCount !== 1) {
      throw new Error('Failed to update withdrawal to PAID (may be concurrent execution)');
    }
    finalWithdrawalStatus = updateWithdrawal.rows[0].status;

    
const accountRes = await client.query(
  `SELECT id FROM account WHERE group_id = $1 LIMIT 1`,
  [group_id]
);

if (accountRes.rowCount !== 1) {
  throw new Error(`Cannot find a valid account for group ${group_id}`);
}

const ledgerAccountId = accountRes.rows[0].id;


const ledgerInsertQuery = `
  INSERT INTO ledger_entry (group_id, account_id, type, amount_kobo, source, reference, created_at)
  VALUES ($1, $2, 'DEBIT', $3, 'payout', $4, NOW())
  RETURNING *;
`;

const ledgerValues = [
  group_id,
  ledgerAccountId,
  amount_kobo,
  `PAYOUT_${withdrawalId}_${Date.now()}`
];

const ledgerInsert = await client.query(ledgerInsertQuery, ledgerValues);
if (ledgerInsert.rowCount !== 1) {
  throw new Error('Failed to insert ledger entry for payout');
}

  } else {
    const recoveryQuery = `
      INSERT INTO payout_recovery (withdrawal_id, attempt_payload, error_details, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *;
    `;
    const errorDetails = providerResponse?.error_code ?? providerResponse?.message ?? 'Provider failed';
    await client.query(recoveryQuery, [withdrawalId, JSON.stringify(payoutResult), errorDetails]);
  }

  return { withdrawalStatus: finalWithdrawalStatus, payout: payoutRow };
};


// ALTER TABLE withdrawal_request
// ADD COLUMN executed_at TIMESTAMP WITH TIME ZONE;


// -- Drop old check constraint
// ALTER TABLE withdrawal_request
// DROP CONSTRAINT withdrawal_request_status_check;

// -- Add updated check constraint including PAID
// ALTER TABLE withdrawal_request
// ADD CONSTRAINT withdrawal_request_status_check
// CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'PAID'));


