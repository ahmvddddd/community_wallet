const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const Joi = require('joi');
const crypto = require('crypto');



const flwBaseUrl = process.env.FLW_BASE_URL || 'https://api.flutterwave.com/v3';
const axiosInstance = axios.create({
  baseURL: flwBaseUrl,
  timeout: Number(process.env.FLW_REQUEST_TIMEOUT_MS) || 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosRetry(axiosInstance, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response && error.response.status >= 500);
  },
});

const createSubaccountSchema = Joi.object({
  account_name: Joi.string().min(3).max(255).required(),
  email: Joi.string().email().required(),
  country: Joi.string().length(2).required(),
  bank_code: Joi.string().required(),
  metadata: Joi.object().optional(),
});


exports.createPayoutSubaccountAndVirtualAccount = async (req, res) => {
  
  const { error, value } = createSubaccountSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ status: 'error', message: 'Invalid input', details: error.details });
  }

  
  const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
  if (!FLW_SECRET_KEY) {
    return res.status(500).json({ status: 'error', message: 'Server misconfiguration: payment provider secret missing' });
  }

  try {
    const idempotencyKey = req.headers['idempotency-key'] || `psa_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;

    
    const createResp = await axiosInstance.post(
      `${process.env.FLW_BASE_URL}/v3/payout-subaccounts`,
      {
        account_name: value.account_name,
        email: value.email,
        country: value.country,
        bank_code: value.bank_code,
        
        ...(value.metadata ? { metadata: value.metadata } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );

    
    if (!createResp?.data || createResp.data.status !== 'success') {
      return res.status(502).json({
        status: 'error',
        message: 'Failed to create payout subaccount',
        providerResponse: createResp.data || null,
      });
    }

    const payoutData = createResp.data.data || createResp.data;
    const accountReference = payoutData.account_reference || payoutData.accountReference || payoutData.accountReference;

    if (!accountReference) {
      return res.status(502).json({
        status: 'error',
        message: 'Payout subaccount created but no account_reference returned by provider',
        providerData: payoutData,
      });
    }

    

    const staticResp = await axiosInstance.get(`${process.env.FLW_BASE_URL}/v3/payout-subaccounts/${accountReference}`, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
      },
    });

    if (!staticResp?.data || staticResp.data.status !== 'success') {
      return res.status(502).json({
        status: 'error',
        message: 'Subaccount was created but failed to fetch static virtual account',
        createResponse: payoutData,
        staticResponse: staticResp?.data || null,
      });
    }

    const staticData = staticResp.data.data || staticResp.data;
    

    const result = {
      payout_subaccount: {
        id: payoutData.id,
        account_name: payoutData.account_name,
        account_reference: accountReference,
        email: payoutData.email,
        barter_id: payoutData.barter_id,
        nuban: payoutData.nuban,
        bank_name: payoutData.bank_name,
        bank_code: payoutData.bank_code,
        status: payoutData.status,
        created_at: payoutData.created_at,
      },
      virtual_account: {
        static_account: staticData.static_account || staticData.staticAccount,
        bank_name: staticData.bank_name || staticData.bankName,
        bank_code: staticData.bank_code || staticData.bankCode,
        currency: staticData.currency || 'NGN',
      },
    };

    
    return res.status(201).json({ status: 'success', message: 'Payout subaccount and static virtual account created', data: result });
  } catch (err) {
    
    console.error('Flutterwave createPayoutSubaccount error:', err?.response?.status, err?.response?.data?.message || err.message);
    const providerErr = err?.response?.data || null;
    return res.status(500).json({
      status: 'error',
      message: 'Unexpected error while creating payout subaccount',
      providerError: providerErr,
    });
  }
};


exports.verifyWebhook = (rawBodyBuffer, signatureHeaderValue) => {
  const secretHash = process.env.FLW_WEBHOOK_SECRET;
  if (!secretHash) return false;

  
  const computed = crypto.createHmac('sha256', secretHash).update(rawBodyBuffer).digest('hex');

  
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeaderValue));
};
