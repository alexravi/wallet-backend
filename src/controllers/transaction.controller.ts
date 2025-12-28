import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
  getTransactions,
  getTransactionById,
  getDailyTransactions,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
} from '../services/transaction.service';

/**
 * Create a new transaction
 */
export const createTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateTransactionData = {
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
      personId: req.body.personId,
      date: new Date(req.body.date || Date.now()),
      referenceNumber: req.body.referenceNumber,
      transferToAccountId: req.body.transferToAccountId,
    };

    const transaction = await createTransaction(data);
    res.status(201).json({
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error: any) {
    if (error.message === 'Duplicate transaction detected') {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to create transaction',
    });
  }
};

/**
 * Get transactions with filters
 */
export const getTransactionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const filters: TransactionFilters = {
      userId,
      accountId: req.query.accountId as string,
      accountType: req.query.accountType as 'bank' | 'cash',
      type: req.query.type as 'income' | 'expense' | 'transfer',
      category: req.query.category as string,
      personId: req.query.personId as string,
      status: req.query.status as 'pending' | 'completed' | 'cancelled',
      includeDeleted: req.query.includeDeleted === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
    };

    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    const result = await getTransactions(filters);
    res.json({
      message: 'Transactions retrieved successfully',
      data: result.transactions,
      total: result.total,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve transactions',
    });
  }
};

/**
 * Get transaction by ID
 */
export const getTransactionByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.id;
    const transaction = await getTransactionById(transactionId, userId);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    res.json({
      message: 'Transaction retrieved successfully',
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve transaction',
    });
  }
};

/**
 * Update transaction
 */
export const updateTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.id;
    const data: UpdateTransactionData = {
      amount: req.body.amount,
      description: req.body.description,
      category: req.body.category,
      notes: req.body.notes,
      attachments: req.body.attachments,
      personId: req.body.personId,
      date: req.body.date ? new Date(req.body.date) : undefined,
      status: req.body.status,
      referenceNumber: req.body.referenceNumber,
    };

    // Remove undefined fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateTransactionData] === undefined) {
        delete data[key as keyof UpdateTransactionData];
      }
    });

    const transaction = await updateTransaction(transactionId, userId, data);

    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    res.json({
      message: 'Transaction updated successfully',
      data: transaction,
    });
  } catch (error: any) {
    if (error.message === 'Update would create a duplicate transaction') {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to update transaction',
    });
  }
};

/**
 * Delete transaction
 */
export const deleteTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.id;
    const success = await deleteTransaction(transactionId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    res.json({
      message: 'Transaction deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to delete transaction',
    });
  }
};

/**
 * Get daily transactions
 */
export const getDailyTransactionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();
    const includeDeleted = req.query.includeDeleted === 'true';

    const transactions = await getDailyTransactions(userId, date, includeDeleted);

    res.json({
      message: 'Daily transactions retrieved successfully',
      data: transactions,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve daily transactions',
    });
  }
};

/**
 * Restore a soft-deleted transaction
 */
export const restoreTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactionId = req.params.id;
    const success = await restoreTransaction(transactionId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Transaction not found or not deleted',
      });
    }

    res.json({
      message: 'Transaction restored successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to restore transaction',
    });
  }
};

/**
 * Check for duplicate transactions
 */
export const checkDuplicatesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { transactions } = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({
        error: 'Transactions must be an array',
      });
    }

    const { generateDuplicateHash } = await import('../services/transaction.service');
    const { Transaction } = await import('../models/Transaction.model');

    const duplicateChecks = await Promise.all(
      transactions.map(async (tx: any) => {
        const hash = generateDuplicateHash(
          new Date(tx.date),
          tx.amount,
          tx.description,
          tx.accountId
        );

        const existing = await Transaction.findOne({
          userId,
          duplicateCheckHash: hash,
          deletedAt: null,
        });

        return {
          ...tx,
          isDuplicate: !!existing,
          matchingTransactionId: existing?._id?.toString(),
        };
      })
    );

    res.json({
      message: 'Duplicate check completed',
      data: duplicateChecks,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to check duplicates',
    });
  }
};

