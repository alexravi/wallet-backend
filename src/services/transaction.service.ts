import { Transaction, ITransaction } from '../models/Transaction.model';
import crypto from 'crypto';

export interface CreateTransactionData {
  userId: string;
  accountId: string;
  accountType: 'bank' | 'cash';
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  category?: string; // Support both ObjectId and string
  notes?: string;
  attachments?: string[];
  personId?: string;
  date: Date;
  referenceNumber?: string;
  transferToAccountId?: string;
  groupId?: string;
}

export interface UpdateTransactionData {
  amount?: number;
  description?: string;
  category?: string; // Support both ObjectId and string
  notes?: string;
  attachments?: string[];
  personId?: string;
  date?: Date;
  status?: 'pending' | 'completed' | 'cancelled';
  referenceNumber?: string;
}

export interface TransactionFilters {
  userId: string;
  accountId?: string;
  accountType?: 'bank' | 'cash';
  type?: 'income' | 'expense' | 'transfer';
  category?: string;
  personId?: string;
  groupId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'pending' | 'completed' | 'cancelled';
  includeDeleted?: boolean;
  limit?: number;
  skip?: number;
}

/**
 * Generate a hash for duplicate detection
 * Hash is based on: date + amount + description + accountId
 */
export const generateDuplicateHash = (
  date: Date,
  amount: number,
  description: string,
  accountId: string
): string => {
  const normalizedDescription = description.trim().toLowerCase();
  const dateStr = new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD
  const hashString = `${dateStr}|${amount}|${normalizedDescription}|${accountId}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
};

/**
 * Check if a transaction is a duplicate
 */
export const checkDuplicates = async (
  userId: string,
  transactions: Array<{
    date: Date;
    amount: number;
    description: string;
    accountId: string;
  }>
): Promise<Map<string, ITransaction | null>> => {
  const duplicateMap = new Map<string, ITransaction | null>();

  for (const tx of transactions) {
    const hash = generateDuplicateHash(tx.date, tx.amount, tx.description, tx.accountId);
    const existing = await Transaction.findOne({
      userId,
      duplicateCheckHash: hash,
    });
    duplicateMap.set(hash, existing);
  }

  return duplicateMap;
};

/**
 * Create a new transaction
 */
export const createTransaction = async (
  data: CreateTransactionData
): Promise<ITransaction> => {
  const duplicateHash = generateDuplicateHash(
    data.date,
    data.amount,
    data.description,
    data.accountId
  );

  // Check for duplicate (excluding soft-deleted)
  const existing = await Transaction.findOne({
    userId: data.userId,
    duplicateCheckHash: duplicateHash,
    deletedAt: null,
  });

  if (existing) {
    throw new Error('Duplicate transaction detected');
  }

  const transaction = new Transaction({
    ...data,
    duplicateCheckHash: duplicateHash,
    status: data.type === 'transfer' ? 'completed' : 'completed',
  });

  return await transaction.save();
};

/**
 * Create multiple transactions (for bulk import)
 */
export const createTransactions = async (
  transactions: CreateTransactionData[],
  skipDuplicates: boolean = false
): Promise<{ created: ITransaction[]; skipped: number; duplicates: number }> => {
  const created: ITransaction[] = [];
  let skipped = 0;
  let duplicates = 0;

  for (const txData of transactions) {
    try {
      const hash = generateDuplicateHash(
        txData.date,
        txData.amount,
        txData.description,
        txData.accountId
      );

      if (skipDuplicates) {
        const existing = await Transaction.findOne({
          userId: txData.userId,
          duplicateCheckHash: hash,
          deletedAt: null,
        });
        if (existing) {
          duplicates++;
          continue;
        }
      }

      const transaction = new Transaction({
        ...txData,
        duplicateCheckHash: hash,
        status: 'completed',
      });

      const saved = await transaction.save();
      created.push(saved);
    } catch (error: any) {
      if (error.message === 'Duplicate transaction detected' && skipDuplicates) {
        duplicates++;
      } else {
        skipped++;
      }
    }
  }

  return { created, skipped, duplicates };
};

/**
 * Update a transaction
 */
export const updateTransaction = async (
  transactionId: string,
  userId: string,
  data: UpdateTransactionData
): Promise<ITransaction | null> => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId,
    deletedAt: null, // Don't allow updating soft-deleted transactions
  });

  if (!transaction) {
    return null;
  }

  // If critical fields are updated, regenerate duplicate hash
  if (data.date || data.amount || data.description) {
    const newDate = data.date || transaction.date;
    const newAmount = data.amount !== undefined ? data.amount : transaction.amount;
    const newDescription = data.description || transaction.description;

    const newHash = generateDuplicateHash(
      newDate,
      newAmount,
      newDescription,
      transaction.accountId.toString()
    );

    // Check if new hash would create a duplicate (excluding current transaction and soft-deleted)
    const existing = await Transaction.findOne({
      userId,
      duplicateCheckHash: newHash,
      _id: { $ne: transactionId },
      deletedAt: null,
    });

    if (existing) {
      throw new Error('Update would create a duplicate transaction');
    }

    transaction.duplicateCheckHash = newHash;
  }

  Object.assign(transaction, data);
  return await transaction.save();
};

/**
 * Delete a transaction (soft delete)
 */
export const deleteTransaction = async (
  transactionId: string,
  userId: string
): Promise<boolean> => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId,
    deletedAt: null, // Only soft-delete if not already deleted
  });

  if (!transaction) {
    return false;
  }

  transaction.deletedAt = new Date();
  await transaction.save();

  return true;
};

/**
 * Restore a soft-deleted transaction
 */
export const restoreTransaction = async (
  transactionId: string,
  userId: string
): Promise<boolean> => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId,
    deletedAt: { $ne: null }, // Only restore if deleted
  });

  if (!transaction) {
    return false;
  }

  transaction.deletedAt = undefined;
  await transaction.save();

  return true;
};

/**
 * Get transactions with filters
 */
export const getTransactions = async (
  filters: TransactionFilters
): Promise<{ transactions: ITransaction[]; total: number }> => {
  const query: any = {
    userId: filters.userId,
  };

  // Soft delete filter - by default exclude deleted
  if (!filters.includeDeleted) {
    query.deletedAt = null;
  }

  if (filters.accountId) {
    query.accountId = filters.accountId;
  }

  if (filters.accountType) {
    query.accountType = filters.accountType;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.personId) {
    query.personId = filters.personId;
  }

  if (filters.groupId) {
    query.groupId = filters.groupId;
  }

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) {
      query.date.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.date.$lte = filters.endDate;
    }
  }

  const total = await Transaction.countDocuments(query);

  const transactions = await Transaction.find(query)
    .sort({ date: -1, createdAt: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0);

  return { transactions, total };
};

/**
 * Get daily transactions for a specific date
 */
export const getDailyTransactions = async (
  userId: string,
  date: Date,
  includeDeleted: boolean = false
): Promise<ITransaction[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query: any = {
    userId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  };

  if (!includeDeleted) {
    query.deletedAt = null;
  }

  return await Transaction.find(query)
    .sort({ date: 1, createdAt: 1 })
    .populate('category', 'name icon color')
    .populate('personId', 'name type');
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (
  transactionId: string,
  userId: string,
  includeDeleted: boolean = false
): Promise<ITransaction | null> => {
  const query: any = {
    _id: transactionId,
    userId,
  };

  if (!includeDeleted) {
    query.deletedAt = null;
  }

  return await Transaction.findOne(query)
    .populate('category', 'name icon color')
    .populate('personId', 'name type');
};

