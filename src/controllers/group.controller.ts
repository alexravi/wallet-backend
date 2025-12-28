import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createGroup,
  updateGroup,
  addGroupMember,
  removeGroupMember,
  getGroupTransactions,
  getGroupSummary,
  getGroups,
  getGroupById,
  deleteGroup,
  CreateGroupData,
  UpdateGroupData,
} from '../services/group.service';

/**
 * Create a new group
 */
export const createGroupHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateGroupData = {
      userId,
      name: req.body.name,
      type: req.body.type || 'custom',
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      budget: req.body.budget,
      currency: req.body.currency || 'INR',
      members: req.body.members || [],
      notes: req.body.notes,
    };

    const group = await createGroup(data);
    res.status(201).json({
      message: 'Group created successfully',
      data: group,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create group',
    });
  }
};

/**
 * Get all groups
 */
export const getGroupsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const includeInactive = req.query.includeInactive === 'true';

    const groups = await getGroups(userId, includeInactive);
    res.json({
      data: groups,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get groups',
    });
  }
};

/**
 * Get group by ID
 */
export const getGroupByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const group = await getGroupById(groupId, userId);
    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
      });
    }

    res.json({
      data: group,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get group',
    });
  }
};

/**
 * Update group
 */
export const updateGroupHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const data: UpdateGroupData = {
      name: req.body.name,
      type: req.body.type,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      budget: req.body.budget,
      currency: req.body.currency,
      notes: req.body.notes,
      isActive: req.body.isActive,
    };

    const group = await updateGroup(groupId, userId, data);
    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
      });
    }

    res.json({
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to update group',
    });
  }
};

/**
 * Delete group
 */
export const deleteGroupHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const success = await deleteGroup(groupId, userId);
    if (!success) {
      return res.status(404).json({
        error: 'Group not found',
      });
    }

    res.json({
      message: 'Group deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to delete group',
    });
  }
};

/**
 * Add member to group
 */
export const addGroupMemberHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const personId = req.body.personId;

    if (!personId) {
      return res.status(400).json({
        error: 'personId is required',
      });
    }

    const group = await addGroupMember(groupId, userId, personId);
    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
      });
    }

    res.json({
      message: 'Member added successfully',
      data: group,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to add member',
    });
  }
};

/**
 * Remove member from group
 */
export const removeGroupMemberHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;
    const personId = req.params.personId;

    const group = await removeGroupMember(groupId, userId, personId);
    if (!group) {
      return res.status(404).json({
        error: 'Group not found',
      });
    }

    res.json({
      message: 'Member removed successfully',
      data: group,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to remove member',
    });
  }
};

/**
 * Get group summary
 */
export const getGroupSummaryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const summary = await getGroupSummary(groupId, userId);
    res.json({
      data: summary,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get group summary',
    });
  }
};

/**
 * Get group transactions
 */
export const getGroupTransactionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const groupId = req.params.id;

    const transactions = await getGroupTransactions(groupId, userId);
    res.json({
      data: transactions,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get group transactions',
    });
  }
};

