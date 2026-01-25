let uuidv4;

(async () => {
    const { v4 } = await import('uuid');
    uuidv4 = v4;
})();
const { getGroup, insertDeposit, fetchToken, fetchByToken } = require('../../models/transaction/depositModel');

exports.createDeposit = async (req, res) => {
    try {
        const { group_id } = req.params;

        if (!group_id) {
            return res.status(400).json({ error: "group_id is required" });
        }

        const {
            account_number,
            account_name,
            bank_name
        } = req.body;

        if (!account_number || !account_name || !bank_name) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const publicReadToken = uuidv4();
        const ledger_entry_id = uuidv4();
        const account_id = uuidv4();

        const group = await getGroup(group_id);
        if (!group) {
            return res.status(404).json({ error: "Group name not found" });
        }

        await insertDeposit(
            publicReadToken,
            group_id,
            group.name,
            account_id,
            account_number,
            account_name,
            bank_name,
            ledger_entry_id
        );

        console.log(
            `Read token created successfully:
            ${publicReadToken}
            `
        );
        return res.status(201).json({
            public_read_token: publicReadToken
        });
    } catch (error) {
        console.error('Init deposit error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};

exports.getDeposit = async (req, res) => {
    try {
        const { public_read_token, group_id } = req.params;

        if (!public_read_token || typeof public_read_token !== 'string') {
            return res.status(400).json({ error: "Missing required field" });
        }

        const deposit = await fetchToken(public_read_token, group_id);

        if (!deposit) {
            return res.status(404).json({
                error: "Incorrect Public Read Token"
            });
        }

        res.status(200).json(deposit);
    } catch (error) {
        console.error('Get deposit error:', error);
        return res.status(500).json({
            message: error.message
        });
    }
};


exports.getDepositByToken = async (req, res) => {
  try {
    const { public_read_token } = req.params;
    if (!public_read_token) {
      return res.status(400).json({ error: "public_read_token is required" });
    }

    const deposit = await fetchByToken(public_read_token);
    if (!deposit) {
      return res.status(404).json({ error: "Incorrect Public Read Token" });
    }

    return res.status(200).json(deposit);
  } catch (error) {
    console.error("Get deposit by token error:", error);
    return res.status(500).json({ message: error.message });
  }
};
