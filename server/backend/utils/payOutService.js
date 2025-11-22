exports.executePayout = async ({ amountKobo, beneficiary, withdrawalId, groupId, simulateError = false }) => {

  await new Promise(resolve => setTimeout(resolve, process.env.MOCK_DELAY_MS || 200));

  
  if (typeof amountKobo !== 'number' || amountKobo <= 0) {
    return {
      status: 'FAILED',
      providerResponse: {
        provider: 'mock_provider',
        error_code: 'INVALID_AMOUNT',
        message: 'amountKobo must be a positive number'
      }
    };
  }
  if (!beneficiary || !beneficiary.account_number) {
    return {
      status: 'FAILED',
      providerResponse: {
        provider: 'mock_provider',
        error_code: 'INVALID_BENEFICIARY',
        message: 'Beneficiary must have an account_number'
      }
    };
  }

  
  if (simulateError || amountKobo === 999) {
    return {
      status: 'FAILED',
      providerResponse: {
        provider: 'mock_provider',
        error_code: 'SIMULATED_ERROR',
        message: 'Simulated payout failure for testing'
      }
    };
  }

  
  return {
    status: 'SUCCESS',
    providerResponse: {
      provider: 'mock_provider',
      reference: `MOCK_TXN_${Date.now()}`,
      amount_sent: amountKobo,
      recipient: beneficiary.account_number
    }
  };
};
