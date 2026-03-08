let uuidv4;

(async () => {
    const { v4 } = await import('uuid');
    uuidv4 = v4;
})();
const pool = require('../../db/db');
const { getGroup, insertDeposit, fetchToken, fetchByToken, getGroupDeposits, countGroupDeposits } = require('../../models/transaction/depositModel');

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


exports.getGroupDeposits = async (req, res) => {
    try {
        const {
            search,
            status,
            bankName,
            accountNumber,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        const groupId = req.params.group_id;

        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "groupId is required"
            });
        }

        // Check membership
        const memberResult = await pool.query(
            'SELECT user_id FROM group_membership WHERE user_id = $1 AND group_id = $2',
            [userId, groupId],
        );

        if (memberResult.rows.length === 0) {
            return res.status(403).json({
                error: 'You are not authorised to view deposits for this group',
            });
        }

        const parsedPage = parseInt(page);
        const parsedLimit = Math.min(parseInt(limit) || 50, 100);
        const offset = (parsedPage - 1) * parsedLimit;

        const deposits = await getGroupDeposits({
            groupId,
            search,
            status,
            bankName,
            accountNumber,
            startDate,
            endDate,
            limit: parsedLimit,
            offset
        });

        const total = await countGroupDeposits({
            groupId,
            search,
            status,
            bankName,
            accountNumber,
            startDate,
            endDate
        });

        return res.status(200).json({
            success: true,
            page: parsedPage,
            limit: parsedLimit,
            total,
            data: deposits
        });

    } catch (error) {
        console.error("Fetch deposits error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch deposits"
        });
    }
};

