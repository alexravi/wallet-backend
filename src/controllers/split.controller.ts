import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createSplitTransaction,
  getSplitDetails,
  updateSplitTransaction,
  removeSplit,
  SplitTransactionData,
} from '../services/split.service';

/**
 * Create a split transaction
 */
export const createSplitTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: SplitTransactionData = {
      userId,
      accountId: req.body.accountId,
      accountType: req.body.accountType,
      type: req.body.type,
      amount: req.body.amount,
      currency: req.body.currency || 'INR',
      description: req.body.description,
      category: req.body.category,
      notes: req.body.notes,
      attachments: req.body.attachments,
      date: new Date(req.body.date || Date.now()),
      splitType: req.body.splitType,
      personIds: req.body.personIds,
      percentages: req.body.percentages,
      customAmounts: req.body.customAmounts,
      groupId: req.body.groupId,
    };

    const result = await createSplitTransaction(data);
    res.status(201).json({
      message: 'Split transaction created successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create split transaction',
    });
  }
};

/**
 * Get split details
 */
export const getSplitDetailsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.transactionId;

    const details = await getSplitDetails(transactionId, userId);
    if (!details) {
      return res.status(404).json({
        error: 'Split transaction not found',
      });
    }

    res.json({
      data: details,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get split details',
    });
  }
};

/**
 * Update split transaction
 */
export const updateSplitTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.transactionId;

    const data: Partial<SplitTransactionData> = {
      amount: req.body.amount,
      currency: req.body.currency,
      description: req.body.description,
      category: req.body.category,
      notes: req.body.notes,
      attachments: req.body.attachments,
      date: req.body.date ? new Date(req.body.date) : undefined,
      splitType: req.body.splitType,
      personIds: req.body.personIds,
      percentages: req.body.percentages,
      customAmounts: req.body.customAmounts,
      groupId: req.body.groupId,
    };

    const result = await updateSplitTransaction(transactionId, userId, data);
    res.json({
      message: 'Split transaction updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to update split transaction',
    });
  }
};

/**
 * Remove split (convert to regular transaction)
 */
export const removeSplitHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.transactionId;

    const transaction = await removeSplit(transactionId, userId);
    res.json({
      message: 'Split removed successfully',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to remove split',
    });
  }
};

