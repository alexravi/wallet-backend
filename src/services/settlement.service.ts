import { Settlement, ISettlement } from '../models/Settlement.model';
import { Transaction } from '../models/Transaction.model';
import { Person } from '../models/Person.model';
import { createTransaction, CreateTransactionData } from './transaction.service';

export interface CreateSettlementData {
  userId: string;
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  currency: string;
  settlementMethod?: 'bank' | 'cash' | 'other';
  notes?: string;
  createTransaction?: boolean; // Whether to create a settlement transaction
  accountId?: string;
  accountType?: 'bank' | 'cash';
}

export interface PendingBalance {
  fromPersonId: string;
  fromPersonName: string;
  toPersonId: string;
  toPersonName: string;
  amount: number;
  currency: string;
}

/**
 * Calculate pending balances from split transactions
 */
export const calculatePendingBalances = async (
  userId: string
): Promise<PendingBalance[]> => {
  // Get all split child transactions (not deleted)
  const childTransactions = await Transaction.find({
    userId,
    parentTransactionId: { $exists: true, $ne: null },
    deletedAt: null,
    type: 'expense', // Only expenses create debts
  })
    .populate('personId', 'name')
    .populate('parentTransactionId');

  // Get all settled amounts
  const settledAmounts = await Settlement.find({
    userId,
    status: 'settled',
  });

  // Build balance map: fromPerson -> toPerson -> amount
  const balanceMap = new Map<string, Map<string, number>>();

  for (const childTx of childTransactions) {
    const parentTx = childTx.parentTransactionId as any;
    if (!parentTx || !childTx.personId) continue;

    // The user (who created the transaction) is the payer
    // The person in the child transaction owes the user
    const payerId = userId; // User who paid
    const debtorId = childTx.personId.toString();

    // Skip if person owes themselves
    if (payerId === debtorId) continue;

    if (!balanceMap.has(debtorId)) {
      balanceMap.set(debtorId, new Map());
    }

    const debtorMap = balanceMap.get(debtorId)!;
    const currentAmount = debtorMap.get(payerId) || 0;
    debtorMap.set(payerId, currentAmount + childTx.amount);
  }

  // Subtract settled amounts
  for (const settlement of settledAmounts) {
    const fromId = settlement.fromPersonId.toString();
    const toId = settlement.toPersonId.toString();

    if (!balanceMap.has(fromId)) {
      balanceMap.set(fromId, new Map());
    }

    const debtorMap = balanceMap.get(fromId)!;
    const currentAmount = debtorMap.get(toId) || 0;
    const newAmount = currentAmount - settlement.amount;

    if (newAmount <= 0) {
      debtorMap.delete(toId);
      if (debtorMap.size === 0) {
        balanceMap.delete(fromId);
      }
    } else {
      debtorMap.set(toId, newAmount);
    }
  }

  // Convert to array format
  const pendingBalances: PendingBalance[] = [];
  const peopleMap = new Map<string, string>();

  // Get all people names
  const people = await Person.find({ userId, isActive: true });
  for (const person of people) {
    peopleMap.set(person._id.toString(), person.name);
  }

  for (const [fromPersonId, toPersonMap] of balanceMap.entries()) {
    for (const [toPersonId, amount] of toPersonMap.entries()) {
      if (amount > 0.01) { // Only include significant balances
        pendingBalances.push({
          fromPersonId,
          fromPersonName: peopleMap.get(fromPersonId) || 'Unknown',
          toPersonId,
          toPersonName: peopleMap.get(toPersonId) || 'Unknown',
          amount: Math.round(amount * 100) / 100,
          currency: 'INR', // TODO: Support multiple currencies
        });
      }
    }
  }

  return pendingBalances;
};

/**
 * Create a settlement
 */
export const createSettlement = async (
  data: CreateSettlementData
): Promise<ISettlement> => {
  // Validate people exist
  const [fromPerson, toPerson] = await Promise.all([
    Person.findOne({ _id: data.fromPersonId, userId: data.userId, isActive: true }),
    Person.findOne({ _id: data.toPersonId, userId: data.userId, isActive: true }),
  ]);

  if (!fromPerson || !toPerson) {
    throw new Error('One or both people not found or inactive');
  }

  // Check pending balance
  const pendingBalances = await calculatePendingBalances(data.userId);
  const pendingBalance = pendingBalances.find(
    pb => pb.fromPersonId === data.fromPersonId && pb.toPersonId === data.toPersonId
  );

  if (!pendingBalance || pendingBalance.amount < data.amount) {
    throw new Error('Settlement amount exceeds pending balance');
  }

  // Create settlement
  const settlement = new Settlement({
    userId: data.userId,
    fromPersonId: data.fromPersonId,
    toPersonId: data.toPersonId,
    amount: data.amount,
    currency: data.currency,
    status: 'pending',
    settlementMethod: data.settlementMethod,
    notes: data.notes,
  });

  // Create settlement transaction if requested
  if (data.createTransaction && data.accountId && data.accountType) {
    const transactionData: CreateTransactionData = {
      userId: data.userId,
      accountId: data.accountId,
      accountType: data.accountType,
      type: 'expense',
      amount: data.amount,
      currency: data.currency,
      description: `Settlement: ${fromPerson.name} → ${toPerson.name}`,
      notes: data.notes,
      date: new Date(),
    };

    const transaction = await createTransaction(transactionData);
    settlement.transactionId = transaction._id;
  }

  await settlement.save();
  return settlement;
};

/**
 * Mark settlement as settled
 */
export const settleBalance = async (
  settlementId: string,
  userId: string,
  settlementDate?: Date
): Promise<ISettlement | null> => {
  const settlement = await Settlement.findOne({
    _id: settlementId,
    userId,
    status: 'pending',
  });

  if (!settlement) {
    return null;
  }

  settlement.status = 'settled';
  settlement.settlementDate = settlementDate || new Date();
  await settlement.save();

  return settlement;
};

/**
 * Get settlement history
 */
export const getSettlementHistory = async (
  userId: string,
  limit: number = 50,
  skip: number = 0
): Promise<{ settlements: ISettlement[]; total: number }> => {
  const query = { userId };

  const total = await Settlement.countDocuments(query);

  const settlements = await Settlement.find(query)
    .populate('fromPersonId', 'name')
    .populate('toPersonId', 'name')
    .populate('transactionId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  return { settlements, total };
};

/**
 * Get pending settlements
 */
export const getPendingSettlements = async (
  userId: string
): Promise<ISettlement[]> => {
  return await Settlement.find({
    userId,
    status: 'pending',
  })
    .populate('fromPersonId', 'name')
    .populate('toPersonId', 'name')
    .populate('transactionId')
    .sort({ createdAt: -1 });
};

/**
 * Get settlement by ID
 */
export const getSettlementById = async (
  settlementId: string,
  userId: string
): Promise<ISettlement | null> => {
  return await Settlement.findOne({
    _id: settlementId,
    userId,
  })
    .populate('fromPersonId', 'name')
    .populate('toPersonId', 'name')
    .populate('transactionId');
};

