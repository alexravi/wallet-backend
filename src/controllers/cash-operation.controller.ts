import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  cashIn,
  cashOut,
  transferBetweenAccounts,
  monthlyReconciliation,
  CashInData,
  CashOutData,
  TransferData,
  ReconciliationData,
} from '../services/cash-operation.service';

/**
 * Cash in operation
 */
export const cashInHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CashInData = {
      walletId: req.body.walletId,
      userId,
      amount: req.body.amount,
      description: req.body.description,
      date: new Date(req.body.date || Date.now()),
      currency: req.body.currency || 'INR',
      category: req.body.category,
    };

    const result = await cashIn(data);
    res.status(201).json({
      message: 'Cash in successful',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to process cash in',
    });
  }
};

/**
 * Cash out operation
 */
export const cashOutHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CashOutData = {
      walletId: req.body.walletId,
      userId,
      amount: req.body.amount,
      description: req.body.description,
      date: new Date(req.body.date || Date.now()),
      currency: req.body.currency || 'INR',
      category: req.body.category,
    };

    const result = await cashOut(data);
    res.status(201).json({
      message: 'Cash out successful',
      data: result,
    });
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to process cash out',
    });
  }
};

/**
 * Transfer between accounts
 */
export const transferHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: TransferData = {
      fromAccountId: req.body.fromAccountId,
      fromAccountType: req.body.fromAccountType,
      toAccountId: req.body.toAccountId,
      toAccountType: req.body.toAccountType,
      userId,
      amount: req.body.amount,
      description: req.body.description,
      date: new Date(req.body.date || Date.now()),
      currency: req.body.currency || 'INR',
      category: req.body.category,
    };

    const result = await transferBetweenAccounts(data);
    res.status(201).json({
      message: 'Transfer successful',
      data: result,
    });
  } catch (error: any) {
    if (error.message === 'Insufficient balance in source account') {
      return res.status(400).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to process transfer',
    });
  }
};

/**
 * Get monthly reconciliation data
 */
export const getReconciliationHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletId = req.params.walletId;
    const month = parseInt(req.query.month as string) || new Date().getMonth();
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const data: ReconciliationData = {
      walletId,
      userId,
      month,
      year,
    };

    const result = await monthlyReconciliation(data);
    res.json({
      message: 'Reconciliation data retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get reconciliation data',
    });
  }
};

/**
 * Mark reconciliation as complete
 */
export const completeReconciliationHandler = async (req: AuthRequest, res: Response) => {
  try {
    // This is a placeholder - you might want to store reconciliation records
    // For now, we'll just return success
    res.json({
      message: 'Reconciliation marked as complete',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to mark reconciliation as complete',
    });
  }
};

