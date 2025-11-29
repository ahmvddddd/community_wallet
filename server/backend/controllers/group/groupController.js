const groupModel = require('../../models/group/groupModels');
const pool = require('../../db/db');

exports.getBalance = async (req, res) => {
    try {
        const { group_id } = req.params;
        const data = await groupModel.getBalance(group_id);

        if (!data) {
            return res.status(404).json({ message: 'Group balance not found' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching contributions:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getContributions = async (req, res) => {
    try {
        const { group_id } = req.params;
        const data = await groupModel.getContributions(group_id);

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Group contributions not found' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching contributions:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const {
            groupName,
            description,
            rule_template,
            approvals_required,
            approvals_cap } = req.body

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!groupName || !description || !rule_template || !approvals_required || !approvals_cap) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const create = await groupModel.insertGroup({
            name: groupName,
            description,
            rule_template,
            approvals_required,
            approvals_cap,
            created_by: req.user.id
        });


        if (!create) {
            return res.status(404).json({ error: 'Unable to create group' })
        }


        return res.status(200).json({ message: 'Group created successfully', group: create });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


exports.getAllMygroups = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const myGroups = await groupModel.getMyGroups(req.user.id);

        return res.status(200).json({
            groups: myGroups
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


exports.groupSum = async (req, res) => {
    try {
        const groupId = req.params.group_id;

        if (!groupId) {
            return res.status(400).json({ error: 'No Group Id' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const memberCheck = await pool.query(
            'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
            [req.user.id, groupId]
        );
        if (!memberCheck.rowCount) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const totalSummary = await groupModel.groupSummary(groupId);

        if (!totalSummary) {
            return res.status(404).json({ error: 'Group not found or no data' });
        }

        return res.status(200).json(totalSummary);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


exports.getGroupLedger = async (req, res) => {
    try {
        const { group_id } = req.params;

        const page = parseInt(req.query.page || "1", 10);
        const pageSize = parseInt(req.query.pageSize || "20", 10);

        if (!group_id) {
            return res.status(400).json({
                status: "error",
                message: "group_id parameter is required"
            });
        }

        const memberCheck = await pool.query(
            'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
            [req.user.id, group_id]
        );
        if (!memberCheck.rowCount) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const [entries, total] = await Promise.all([
            groupModel.getLedgerEntries(group_id, page, pageSize),
            groupModel.getLedgerEntryCount(group_id)
        ]);

        return res.status(200).json({
            status: "success",
            data: {
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                },
                entries
            }
        });

    } catch (err) {
        console.error("Error loading group ledger:", err);
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        });
    }
};
