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


// exports.getGroupLedger = async (req, res) => {
//     try {
//         const { group_id } = req.params;

//         const page = parseInt(req.query.page || "1", 10);
//         const pageSize = parseInt(req.query.pageSize || "20", 10);

//         if (!group_id) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "group_id parameter is required"
//             });
//         }

//         if (!req.user || !req.user.id) {
//             return res.status(401).json({ error: 'Unauthorized' });
//         }

//         const memberCheck = await pool.query(
//             'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
//             [req.user.id, group_id]
//         );
//         if (!memberCheck.rowCount) {
//             return res.status(403).json({ error: 'You are not a member of this group' });
//         }


//         const [entries, total] = await Promise.all([
//             groupModel.getLedgerEntries(group_id, page, pageSize),
//             groupModel.getLedgerEntryCount(group_id)
//         ]);

//         return res.status(200).json({
//             status: "success",
//             data: {
//                 pagination: {
//                     page,
//                     pageSize,
//                     total,
//                     totalPages: Math.ceil(total / pageSize)
//                 },
//                 entries
//             }
//         });

//     } catch (err) {
//         console.error("Error loading group ledger:", err);
//         return res.status(500).json({
//             status: "error",
//             message: "Internal server error"
//         });
//     }
// };
// groupController.js

exports.getGroupLedger = async (req, res) => {
  try {
    const { group_id } = req.params;

    const page = parseInt(req.query.page || "1", 10);
    const pageSize = parseInt(req.query.pageSize || "20", 10);

    if (!group_id) {
      return res.status(400).json({
        status: "error",
        message: "group_id parameter is required",
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const memberCheck = await pool.query(
      "SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1",
      [req.user.id, group_id]
    );
    if (!memberCheck.rowCount) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group" });
    }

    const [entries, total] = await Promise.all([
      groupModel.getLedgerEntries(group_id, page, pageSize, req.user.id),
      groupModel.getLedgerEntryCount(group_id),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        entries,
      },
    });
  } catch (err) {
    console.error("Error loading group ledger:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.getLedgerEntryDetail = async (req, res) => {
    try {
        const { group_id, ledger_id } = req.params;

        if (!group_id || !ledger_id) {
            return res.status(400).json({
                status: "error",
                message: "group_id and ledger_id parameters are required"
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const memberCheck = await pool.query(
            'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
            [req.user.id, group_id]
        );

        if (!memberCheck.rowCount) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const entry = await groupModel.getLedgerEntryById(group_id, ledger_id);

        if (!entry) {
            return res.status(404).json({
                status: "error",
                message: "Ledger entry not found"
            });
        }

        return res.status(200).json({
            status: "success",
            data: entry
        });

    } catch (err) {
        console.error("Error loading ledger entry detail:", err);
        return res.status(500).json({
            status: "error",
            message: "Internal server error"
        });
    }
};

exports.groupMembers = async (req, res) => {
    try {
        const groupId = req.params.group_id;
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const offset = Number(req.query.offset) || 0;
        const q = req.query.q?.trim() || null;

        const [members, total] = await Promise.all([
            groupModel.groupMembers(groupId, { limit, offset, q }),
            groupModel.groupMemberCount(groupId, q),
        ]);

        return res.status(200).json({
            members,
            pagination: { limit, offset, total },
        });
    } catch (error) {
        console.error("groupMembers error:", error);
        return res.status(500).json({ message: error.message });
    }
};



exports.getGroupDepositAccount = async (req, res) => {
    try {
        const { group_id } = req.params;

        const account = await groupModel.getGroupDepositAccount(group_id);

        if (!account) {
            return res.status(404).json({
                error: "GROUP_ACCOUNT_NOT_FOUND",
                message: "No deposit account has been created for this group",
            });
        }

        return res.json({
            group_id: account.group_id,
            group_name: account.group_name,
            account_number: account.virtual_account_number,
            bank_name: account.bank_name,
            provider_reference: account.provider_ref,
            created_at: account.created_at,
        });
    } catch (err) {
        console.error("getGroupDepositAccount error:", err);

        return res.status(500).json({
            error: "FAILED_TO_FETCH_GROUP_ACCOUNT",
        });
    }
};

exports.getGroupActivity = async (req, res) => {
    try {
        const { group_id } = req.params;
        const { limit } = req.query;

        if (!group_id) {
            return res.status(400).json({
                status: "error",
                message: "group_id parameter is required"
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const memberCheck = await pool.query(
            'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
            [req.user.id, group_id]
        );
        if (!memberCheck.rowCount) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const parsedLimit = Math.min(parseInt(limit) || 20, 50);

        const activities = await groupModel.groupActivity(
            group_id,
            parsedLimit
        );

        return res.status(200).json({
            success: true,
            data: activities,
        });
    } catch (error) {
        console.error("Error fetching group activity:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch group activity",
        });
    }
};


exports.getGroupWithdrawals = async (req, res) => {
  try {
    const { group_id } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const pageSize = parseInt(req.query.pageSize || "20", 10);

    if (!group_id) {
      return res.status(400).json({
        status: "error",
        message: "group_id parameter is required",
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const memberCheck = await pool.query(
      'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
      [req.user.id, group_id]
    );

    if (!memberCheck.rowCount) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const [withdrawals, total] = await Promise.all([
      groupModel.getGroupWithdrawals(group_id, page, pageSize),
      groupModel.getGroupWithdrawalCount(group_id),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        withdrawals,
      },
    });
  } catch (error) {
    console.error("Error fetching group withdrawals:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};


// exports.getGroupWithdrawalDetails = async (req, res) => {
//   try {
//     const { group_id, withdrawal_id } = req.params;

//     if (!group_id || !withdrawal_id) {
//       return res.status(400).json({
//         status: "error",
//         message: "group_id and withdrawal_id parameters are required",
//       });
//     }

//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // 1. Verify user is a member of the requested group
//     const memberCheck = await pool.query(
//       'SELECT 1 FROM group_membership WHERE user_id = $1 AND group_id = $2 LIMIT 1',
//       [req.user.id, group_id]
//     );

//     if (!memberCheck.rowCount) {
//       return res.status(403).json({ error: "You are not a member of this group" });
//     }

//     // 2. Fetch withdrawal details and approval history concurrently
//     const [withdrawal, approvalHistory] = await Promise.all([
//       groupModel.getGroupWithdrawalById(group_id, withdrawal_id),
//       groupModel.getWithdrawalApprovalHistory(withdrawal_id),
//     ]);

//     if (!withdrawal) {
//       return res.status(404).json({
//         status: "error",
//         message: "Withdrawal request not found",
//       });
//     }

//     // 3. Format payload to include approval counters and history
//     const responseData = {
//       ...withdrawal,
//       approvals: {
//         current: approvalHistory.length,
//         total: withdrawal.approvals_required || 1,
//         history: approvalHistory,
//       },
//     };

//     return res.status(200).json({
//       status: "success",
//       data: {
//         withdrawal: responseData,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching group withdrawal details:", error);
//     return res.status(500).json({
//       status: "error",
//       message: "Internal server error",
//     });
//   }
// };

exports.getGroupWithdrawalDetails = async (req, res) => {
  try {
    const { group_id, withdrawal_id } = req.params;

    if (!group_id || !withdrawal_id) {
      return res.status(400).json({
        status: "error",
        message: "group_id and withdrawal_id parameters are required",
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = await groupModel.getGroupMemberRole(group_id, req.user.id);

    if (!role) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const [withdrawal, approvalHistory] = await Promise.all([
      groupModel.getGroupWithdrawalById(group_id, withdrawal_id),
      groupModel.getWithdrawalApprovalHistory(group_id, withdrawal_id),
    ]);

    if (!withdrawal) {
      return res.status(404).json({
        status: "error",
        message: "Withdrawal request not found",
      });
    }

    const isAdmin = role === "OWNER" || role === "TREASURER";
    const hasApproved = approvalHistory.some(
      (item) => item.approver_user_id === req.user.id
    );

    const responseData = {
      ...withdrawal,
      user_permissions: {
        role,
        can_approve: isAdmin && withdrawal.status === "PENDING" && !hasApproved,
        has_already_approved: hasApproved,
        is_admin: isAdmin,
      },
      approvals: {
        current: approvalHistory.length,
        total: withdrawal.approvals_required || 1,
        history: approvalHistory,
      },
    };

    return res.status(200).json({
      status: "success",
      data: {
        withdrawal: responseData,
      },
    });
  } catch (error) {
    console.error("Error fetching group withdrawal details:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};