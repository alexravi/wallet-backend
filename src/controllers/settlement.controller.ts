import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  calculatePendingBalances,
  createSettlement,
  settleBalance,
  getSettlementHistory,
  getPendingSettlements,
  getSettlementById,
  CreateSettlementData,
} from '../services/settlement.service';

/**
 * Get pending balances
 */
export const getPendingBalancesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const balances = await calculatePendingBalances(userId);
    res.json({
      data: balances,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to calculate pending balances',
    });
  }
};

/**
 * Create settlement
 */
export const createSettlementHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateSettlementData = {
      userId,
      fromPersonId: req.body.fromPersonId,
      toPersonId: req.body.toPersonId,
      amount: req.body.amount,
      currency: req.body.currency || 'INR',
      settlementMethod: req.body.settlementMethod,
      notes: req.body.notes,
      createTransaction: req.body.createTransaction,
      accountId: req.body.accountId,
      accountType: req.body.accountType,
    };

    const settlement = await createSettlement(data);
    res.status(201).json({
      message: 'Settlement created successfully',
      data: settlement,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create settlement',
    });
  }
};

/**
 * Mark settlement as settled
 */
export const settleBalanceHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settlementId = req.params.id;
    const settlementDate = req.body.settlementDate ? new Date(req.body.settlementDate) : undefined;

    const settlement = await settleBalance(settlementId, userId, settlementDate);
    if (!settlement) {
      return res.status(404).json({
        error: 'Settlement not found or already settled',
      });
    }

    res.json({
      message: 'Settlement marked as settled',
      data: settlement,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to settle balance',
    });
  }
};

/**
 * Get settlement history
 */
export const getSettlementHistoryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const result = await getSettlementHistory(userId, limit, skip);
    res.json({
      data: result.settlements,
      total: result.total,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get settlement history',
    });
  }
};

/**
 * Get pending settlements
 */
export const getPendingSettlementsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settlements = await getPendingSettlements(userId);
    res.json({
      data: settlements,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get pending settlements',
    });
  }
};

/**
 * Get settlement by ID
 */
export const getSettlementByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settlementId = req.params.id;

    const settlement = await getSettlementById(settlementId, userId);
    if (!settlement) {
      return res.status(404).json({
        error: 'Settlement not found',
      });
    }

    res.json({
      data: settlement,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to get settlement',
    });
  }
};

