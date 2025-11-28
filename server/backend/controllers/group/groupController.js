const groupModel = require('../../models/group/groupModels');

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

        return res.status(200).json(myGroups);

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

        const totalSummary = await groupModel.groupSummary(groupId);

        if (!totalSummary) {
            return res.status(404).json({ error: 'Group not found or no data' });
        }

        return res.status(200).json(totalSummary);

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
