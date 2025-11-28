module.exports = {
  USER_SECURE_FIELDS: ['email'],

  REFRESH_TOKENS_SECURE_FIELDS: ['device_info', 'ip_address'],

  USER_ACTIVITY_SECURE_FIELDS: ['ip_address', 'device_info'],

  ACCOUNT_SECURE_FIELDS: ['virtual_account_number', 'provider_ref'],

  LEDGER_SECURE_FIELDS: ['reference', 'client_ref'],

  PAYOUT_SECURE_FIELDS: ['beneficiary', 'provider_payload'],

  WITHDRAWAL_SECURE_FIELDS: ['beneficiary', 'reason'],

  // // approval.approver_user_id is a FK → keep unencrypted, or we break joins
  // APPROVAL_SECURE_FIELDS: [],

  VA_REQUEST_SECURE_FIELDS: ['client_ref'],

  VA_RECOVERY_SECURE_FIELDS: ['raw_payload', 'error_message'],

  ACCOUNT_METADATA_SECURE_FIELDS: ['raw_payload'],

  PAYOUT_RECOVERY_SECURE_FIELDS: ['attempted_payload', 'error_message'],

  WEBHOOK_EVENT_SECURE_FIELDS: ['raw_payload'],
};