const axios = require('axios');
const uuidv4 = (...args) => import("uuid").then(mod => mod.v4(...args));


const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3/transfers';


const initiateTransfer = async (req, res) => {
    try {
      
        const { 
            account_bank,
            account_number,
            amount,
            reference
        } = req.body;

        
        if (!account_bank || !account_number || !amount) {
            return res.status(400).json({
                success: false,
                message: "Validation Error: 'account_bank', 'account_number', and 'amount' are required."
            });
        }

        
        const generateReference = () => {
    // Generates a string like: tx-1732234567890-456123
    return `tx-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};
        const txRef = reference || generateReference();

        const payload = {
            account_bank,
            account_number,
            amount: Number(amount),
            narration: 'Transfer from Node Controller',
            currency: 'NGN',
            reference: txRef,
        };

        
        const config = {
            method: 'post',
            url: FLUTTERWAVE_BASE_URL,
            headers: { 
                'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            data: payload
        };

        
        console.log(`[Transfer] Initiating transfer Ref: ${txRef}`);
        const response = await axios(config);

        
        return res.status(200).json({
            success: true,
            message: "Transfer initiated successfully",
            data: response.data.data
        });

    } catch (error) {
      

        console.error('[Transfer Error]', error.message);
        
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || "Upstream provider rejected the request",
                error: error.response.data
            });
        }

        
        return res.status(500).json({
            success: false,
            message: "Internal Server Error or Network Connectivity Issue"
        });
    }
};



const getTransferFee = async (req, res) => {
    try {
        const { amount, currency = 'NGN' } = req.query;

        if(!amount) return res.status(400).json({message: "Amount is required"});

        const config = {
            method: 'get',
            url: `https://api.flutterwave.com/v3/transfers/fee?amount=${amount}&currency=${currency}`,
            headers: { 
                'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}`
            }
        };

        const response = await axios(config);
        return res.status(200).json(response.data);

    } catch (error) {
        console.error('[Fee Error]', error.message);
        return res.status(500).json({ message: "Unable to fetch fees" });
    }
};

module.exports = {
  initiateTransfer,
    getTransferFee
};

// curl --request POST \
//      --url https://api.flutterwave.com/v3/transfers \
//      --header 'Authorization: Bearer FLWSECK_TEST-SANDBOXDEMOKEY-X' \
//      --header 'Content-Type: application/json' \
//      --header 'accept: application/json' \
//      --data '
// {
//   "account_bank": "044",
//   "account_number": "0690000040",
//   "amount": 5500,
//   "currency": "NGN",
//   "debit_subaccount": "PSA******07974",
//   "beneficiary": 3768,
//   "beneficiary_name": "Yemi Desola",
//   "reference": "newFLWXTransfer123",
//   "debit_currency": "USD",
//   "destination_branch_code": "GH280103",
//   "callback_url": "https://webhook.site/5f9a659a-11a2-4925-89cf-8a59ea6a019a",
//   "narration": "Payment for goods purchased"
// }
// '