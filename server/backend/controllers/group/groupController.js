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
