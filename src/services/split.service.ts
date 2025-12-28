import { Transaction, ITransaction, ISplitDetail } from '../models/Transaction.model';
import { Person } from '../models/Person.model';
import { createTransaction, CreateTransactionData } from './transaction.service';

export interface SplitTransactionData {
  userId: string;
  accountId: string;
  accountType: 'bank' | 'cash';
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  category?: string;
  notes?: string;
  attachments?: string[];
  date: Date;
  splitType: 'equal' | 'percentage' | 'custom';
  personIds: string[]; // People to split with
  percentages?: number[]; // For percentage split
  customAmounts?: number[]; // For custom split
  groupId?: string;
}

export interface SplitDetails {
  parentTransaction: ITransaction;
  childTransactions: ITransaction[];
  splitBreakdown: Array<{
    personId: string;
    personName: string;
    amount: number;
    percentage?: number;
  }>;
}

/**
 * Calculate equal split amounts
 */
export const calculateEqualSplit = (totalAmount: number, personCount: number): number[] => {
  const baseAmount = totalAmount / personCount;
  const amounts: number[] = [];
  let sum = 0;

  // Round to 2 decimal places for all but the last
  for (let i = 0; i < personCount - 1; i++) {
    const rounded = Math.round(baseAmount * 100) / 100;
    amounts.push(rounded);
    sum += rounded;
  }

  // Last amount gets the remainder to ensure exact total
  amounts.push(Math.round((totalAmount - sum) * 100) / 100);

  return amounts;
};

/**
 * Calculate percentage split amounts
 */
export const calculatePercentageSplit = (
  totalAmount: number,
  percentages: number[]
): number[] => {
  if (percentages.length === 0) {
    throw new Error('Percentages array cannot be empty');
  }

  const sum = percentages.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error('Percentages must sum to 100%');
  }

  const amounts: number[] = [];
  let calculatedSum = 0;

  // Calculate amounts for all but the last
  for (let i = 0; i < percentages.length - 1; i++) {
    const amount = Math.round((totalAmount * percentages[i] / 100) * 100) / 100;
    amounts.push(amount);
    calculatedSum += amount;
  }

  // Last amount gets the remainder to ensure exact total
  amounts.push(Math.round((totalAmount - calculatedSum) * 100) / 100);

  return amounts;
};

/**
 * Validate custom split amounts
 */
export const validateCustomSplit = (
  totalAmount: number,
  customAmounts: number[]
): void => {
  if (customAmounts.length === 0) {
    throw new Error('Custom amounts array cannot be empty');
  }

  const sum = customAmounts.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - totalAmount) > 0.01) {
    throw new Error(`Custom amounts must sum to ${totalAmount}`);
  }

  if (customAmounts.some(amount => amount < 0)) {
    throw new Error('All custom amounts must be non-negative');
  }
};

/**
 * Create a split transaction (parent + child transactions)
 */
export const createSplitTransaction = async (
  data: SplitTransactionData
): Promise<SplitDetails> => {
  // Validate people exist
  const people = await Person.find({
    _id: { $in: data.personIds },
    userId: data.userId,
    isActive: true,
  });

  if (people.length !== data.personIds.length) {
    throw new Error('One or more people not found or inactive');
  }

  let amounts: number[];
  let splitDetails: ISplitDetail[] = [];

  // Calculate split amounts based on type
  switch (data.splitType) {
    case 'equal':
      amounts = calculateEqualSplit(data.amount, data.personIds.length);
      splitDetails = data.personIds.map((personId, index) => ({
        personId: personId as any,
        amount: amounts[index],
      }));
      break;

    case 'percentage':
      if (!data.percentages || data.percentages.length !== data.personIds.length) {
        throw new Error('Percentages array must match personIds length');
      }
      amounts = calculatePercentageSplit(data.amount, data.percentages);
      splitDetails = data.personIds.map((personId, index) => ({
        personId: personId as any,
        amount: amounts[index],
        percentage: data.percentages![index],
      }));
      break;

    case 'custom':
      if (!data.customAmounts || data.customAmounts.length !== data.personIds.length) {
        throw new Error('Custom amounts array must match personIds length');
      }
      validateCustomSplit(data.amount, data.customAmounts);
      amounts = data.customAmounts;
      splitDetails = data.personIds.map((personId, index) => ({
        personId: personId as any,
        amount: amounts[index],
      }));
      break;

    default:
      throw new Error(`Invalid split type: ${data.splitType}`);
  }

  // Create parent transaction
  const parentData: CreateTransactionData = {
    userId: data.userId,
    accountId: data.accountId,
    accountType: data.accountType,
    type: data.type,
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    category: data.category,
    notes: data.notes,
    attachments: data.attachments,
    date: data.date,
    groupId: data.groupId,
  };

  const parentTransaction = await createTransaction(parentData);

  // Update parent with split information
  parentTransaction.splitType = data.splitType;
  parentTransaction.splitDetails = splitDetails;
  await parentTransaction.save();

  // Create child transactions
  const childTransactions: ITransaction[] = [];
  for (let i = 0; i < data.personIds.length; i++) {
    const childData: CreateTransactionData = {
      userId: data.userId,
      accountId: data.accountId,
      accountType: data.accountType,
      type: data.type,
      amount: amounts[i],
      currency: data.currency,
      description: `${data.description} (split)`,
      category: data.category,
      notes: data.notes,
      attachments: data.attachments,
      personId: data.personIds[i],
      date: data.date,
      groupId: data.groupId,
    };

    const childTransaction = await createTransaction(childData);
    childTransaction.parentTransactionId = parentTransaction._id;
    await childTransaction.save();
    childTransactions.push(childTransaction);
  }

  // Build split breakdown with person names
  const splitBreakdown = splitDetails.map((detail, index) => {
    const person = people.find(p => p._id.toString() === detail.personId.toString());
    return {
      personId: detail.personId.toString(),
      personName: person?.name || 'Unknown',
      amount: detail.amount,
      percentage: detail.percentage,
    };
  });

  return {
    parentTransaction,
    childTransactions,
    splitBreakdown,
  };
};

/**
 * Get split details for a transaction
 */
export const getSplitDetails = async (
  transactionId: string,
  userId: string
): Promise<SplitDetails | null> => {
  const parentTransaction = await Transaction.findOne({
    _id: transactionId,
    userId,
    deletedAt: null,
  }).populate('splitDetails.personId', 'name');

  if (!parentTransaction || !parentTransaction.splitType || parentTransaction.splitType === 'none') {
    return null;
  }

  const childTransactions = await Transaction.find({
    parentTransactionId: transactionId,
    userId,
    deletedAt: null,
  }).populate('personId', 'name');

  const splitBreakdown = (parentTransaction.splitDetails || []).map((detail) => {
    const person = detail.personId as any;
    const childTx = childTransactions.find(
      ct => ct.personId?.toString() === detail.personId.toString()
    );
    return {
      personId: detail.personId.toString(),
      personName: person?.name || 'Unknown',
      amount: detail.amount,
      percentage: detail.percentage,
    };
  });

  return {
    parentTransaction,
    childTransactions,
    splitBreakdown,
  };
};

/**
 * Update split transaction
 */
export const updateSplitTransaction = async (
  transactionId: string,
  userId: string,
  data: Partial<SplitTransactionData>
): Promise<SplitDetails> => {
  const parentTransaction = await Transaction.findOne({
    _id: transactionId,
    userId,
    deletedAt: null,
  });

  if (!parentTransaction || !parentTransaction.splitType || parentTransaction.splitType === 'none') {
    throw new Error('Transaction is not a split transaction');
  }

  // Delete existing child transactions
  await Transaction.updateMany(
    { parentTransactionId: transactionId, userId },
    { deletedAt: new Date() }
  );

  // Create new split with updated data
  const splitData: SplitTransactionData = {
    userId: parentTransaction.userId.toString(),
    accountId: parentTransaction.accountId.toString(),
    accountType: parentTransaction.accountType,
    type: parentTransaction.type,
    amount: data.amount ?? parentTransaction.amount,
    currency: data.currency ?? parentTransaction.currency,
    description: data.description ?? parentTransaction.description,
    category: data.category ?? parentTransaction.category?.toString(),
    notes: data.notes ?? parentTransaction.notes,
    attachments: data.attachments ?? parentTransaction.attachments,
    date: data.date ?? parentTransaction.date,
    splitType: data.splitType ?? parentTransaction.splitType,
    personIds: data.personIds ?? (parentTransaction.splitDetails || []).map(d => d.personId.toString()),
    percentages: data.percentages,
    customAmounts: data.customAmounts,
    groupId: data.groupId ?? parentTransaction.groupId?.toString(),
  };

  // Soft delete old parent
  parentTransaction.deletedAt = new Date();
  await parentTransaction.save();

  // Create new split
  return await createSplitTransaction(splitData);
};

/**
 * Remove split (delete child transactions, convert parent to regular transaction)
 */
export const removeSplit = async (
  transactionId: string,
  userId: string
): Promise<ITransaction> => {
  const parentTransaction = await Transaction.findOne({
    _id: transactionId,
    userId,
    deletedAt: null,
  });

  if (!parentTransaction) {
    throw new Error('Transaction not found');
  }

  // Delete child transactions
  await Transaction.updateMany(
    { parentTransactionId: transactionId, userId },
    { deletedAt: new Date() }
  );

  // Remove split information from parent
  parentTransaction.splitType = undefined;
  parentTransaction.splitDetails = undefined;
  await parentTransaction.save();

  return parentTransaction;
};

