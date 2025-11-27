const pool = require("../../db/db");
const {
    insertAccountForGroup,
    insertAccountMetadata,
} = require("../../models/account/accountModel");

exports.createAccount = async (req, res) => {
    try {
        const client = await pool.connect();
        const { accountNumber, bankName } = req.body;
        const groupId = req.params.group_id;
        tx_ref = `VA_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        if (!accountNumber || !bankName) {
            return res.status(400).json({ message: 'missing required fields' })
        }
        const account = await insertAccountForGroup(client, {
            groupId,
            provider: "flutterwave",
            accountNumber: accountNumber,
            bankName: bankName || "Wema Bank",
            providerRef: tx_ref,
        });

        const accountData = await insertAccountMetadata(client, {
            accountId: account.id,
            provider: "flutterwave",
            rawPayload: account,
        });

        return res.status(200).json({
            account,
            data: { accountData }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}