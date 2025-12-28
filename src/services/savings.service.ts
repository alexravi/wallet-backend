import { SavingsGoal, ISavingsGoal } from '../models/SavingsGoal.model';
import { SavingsContribution, ISavingsContribution } from '../models/SavingsContribution.model';
import { getBankAccountById, updateBankAccountBalance } from './account.service';
import { getCashWalletById, updateCashWalletBalance } from './account.service';
import { createTransaction, CreateTransactionData } from './transaction.service';

export interface CreateSavingsGoalData {
  userId: string;
  goalName: string;
  targetAmount: number;
  targetDate?: Date;
  priority: 'low' | 'medium' | 'high';
  linkedAccountId?: string;
  linkedWalletId?: string;
  accountType?: 'bank' | 'cash' | 'all';
  currency?: string;
  autoContribution?: number;
  notes?: string;
}

export interface AddContributionData {
  goalId: string;
  userId: string;
  amount: number;
  contributionDate: Date;
  sourceAccountId?: string;
  sourceAccountType?: 'bank' | 'cash';
  notes?: string;
  createTransaction?: boolean;
}

export interface SavingsGoalFilters {
  userId: string;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Create a new savings goal
 */
export const createSavingsGoal = async (
  data: CreateSavingsGoalData
): Promise<ISavingsGoal> => {
  // Validate linked account/wallet if provided
  if (data.linkedAccountId) {
    const account = await getBankAccountById(data.linkedAccountId, data.userId);
    if (!account) {
      throw new Error('Bank account not found');
    }
    data.accountType = 'bank';
  } else if (data.linkedWalletId) {
    const wallet = await getCashWalletById(data.linkedWalletId, data.userId);
    if (!wallet) {
      throw new Error('Cash wallet not found');
    }
    data.accountType = 'cash';
  } else {
    data.accountType = data.accountType || 'all';
  }

  const goal = new SavingsGoal({
    ...data,
    currentAmount: 0,
    status: 'active',
    currency: data.currency || 'INR',
  });

  return await goal.save();
};

/**
 * Add contribution to a savings goal
 */
export const addContribution = async (
  data: AddContributionData
): Promise<{
  contribution: ISavingsContribution;
  goal: ISavingsGoal;
  transaction?: any;
}> => {
  const goal = await SavingsGoal.findById(data.goalId);
  if (!goal) {
    throw new Error('Savings goal not found');
  }

  if (goal.userId.toString() !== data.userId) {
    throw new Error('Unauthorized');
  }

  if (goal.status !== 'active') {
    throw new Error('Cannot add contribution to paused, completed, or cancelled goal');
  }

  if (data.amount <= 0) {
    throw new Error('Contribution amount must be greater than 0');
  }

  // Create contribution record
  const contribution = new SavingsContribution({
    goalId: data.goalId,
    userId: data.userId,
    amount: data.amount,
    contributionDate: data.contributionDate,
    sourceAccountId: data.sourceAccountId,
    sourceAccountType: data.sourceAccountType,
    notes: data.notes,
    isAutoContribution: false,
  });

  const savedContribution = await contribution.save();

  // Update goal current amount
  goal.currentAmount += data.amount;

  // Check if goal is completed
  if (goal.currentAmount >= goal.targetAmount) {
    goal.status = 'completed';
  }

  await goal.save();

  // Auto-create transaction if linked to account/wallet and createTransaction is true
  let transaction = null;
  const shouldCreateTransaction =
    data.createTransaction !== false && (goal.linkedAccountId || goal.linkedWalletId);

  if (shouldCreateTransaction) {
    if (goal.linkedAccountId && data.sourceAccountId) {
      const account = await getBankAccountById(data.sourceAccountId, data.userId);
      if (account) {
        const transactionData: CreateTransactionData = {
          userId: data.userId,
          accountId: data.sourceAccountId,
          accountType: 'bank',
          type: 'expense',
          amount: data.amount,
          currency: goal.currency,
          description: `Savings contribution: ${goal.goalName}`,
          date: data.contributionDate,
          notes: data.notes,
        };

        transaction = await createTransaction(transactionData);
        contribution.transactionId = transaction._id;
        await contribution.save();

        // Update account balance (deduct from source)
        await updateBankAccountBalance(data.sourceAccountId, -data.amount);
      }
    } else if (goal.linkedWalletId && data.sourceAccountId) {
      const wallet = await getCashWalletById(data.sourceAccountId, data.userId);
      if (wallet) {
        const transactionData: CreateTransactionData = {
          userId: data.userId,
          accountId: data.sourceAccountId,
          accountType: 'cash',
          type: 'expense',
          amount: data.amount,
          currency: goal.currency,
          description: `Savings contribution: ${goal.goalName}`,
          date: data.contributionDate,
          notes: data.notes,
        };

        transaction = await createTransaction(transactionData);
        contribution.transactionId = transaction._id;
        await contribution.save();

        // Update wallet balance (deduct from source)
        await updateCashWalletBalance(data.sourceAccountId, -data.amount);
      }
    }
  }

  return {
    contribution: savedContribution,
    goal,
    transaction,
  };
};

/**
 * Calculate progress percentage
 */
export const calculateProgress = (goal: ISavingsGoal): number => {
  if (goal.targetAmount === 0) {
    return 0;
  }
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  return Math.min(100, Math.max(0, progress));
};

/**
 * Check for deviation alerts
 */
export const checkDeviation = async (
  goalId: string,
  userId: string
): Promise<{
  isDeviating: boolean;
  expectedAmount: number;
  actualAmount: number;
  deviationPercentage: number;
  message?: string;
}> => {
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw new Error('Savings goal not found');
  }

  if (goal.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  if (!goal.targetDate) {
    return {
      isDeviating: false,
      expectedAmount: 0,
      actualAmount: goal.currentAmount,
      deviationPercentage: 0,
    };
  }

  const now = new Date();
  const startDate = goal.createdAt;
  const targetDate = goal.targetDate;

  // Calculate months elapsed and months remaining
  const monthsElapsed = Math.max(
    0,
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const totalMonths = Math.max(
    1,
    (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Expected amount = (Target Amount / Total Months) × Months Elapsed
  const expectedAmount = (goal.targetAmount / totalMonths) * monthsElapsed;
  const actualAmount = goal.currentAmount;

  // Calculate deviation
  const deviation = actualAmount - expectedAmount;
  const deviationPercentage = expectedAmount > 0 ? (deviation / expectedAmount) * 100 : 0;

  // Consider deviating if behind by more than 10%
  const isDeviating = deviationPercentage < -10;

  let message: string | undefined;
  if (isDeviating) {
    const shortfall = expectedAmount - actualAmount;
    message = `You are behind by ${Math.abs(shortfall).toFixed(2)} ${goal.currency}. Expected: ${expectedAmount.toFixed(2)}, Actual: ${actualAmount.toFixed(2)}`;
  }

  return {
    isDeviating,
    expectedAmount,
    actualAmount,
    deviationPercentage,
    message,
  };
};

/**
 * Pause a savings goal
 */
export const pauseGoal = async (
  goalId: string,
  userId: string
): Promise<ISavingsGoal> => {
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw new Error('Savings goal not found');
  }

  if (goal.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  if (goal.status !== 'active') {
    throw new Error('Only active goals can be paused');
  }

  goal.status = 'paused';
  await goal.save();

  return goal;
};

/**
 * Resume a savings goal
 */
export const resumeGoal = async (
  goalId: string,
  userId: string
): Promise<ISavingsGoal> => {
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw new Error('Savings goal not found');
  }

  if (goal.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  if (goal.status !== 'paused') {
    throw new Error('Only paused goals can be resumed');
  }

  // Don't resume if already completed
  if (goal.currentAmount >= goal.targetAmount) {
    goal.status = 'completed';
  } else {
    goal.status = 'active';
  }

  await goal.save();

  return goal;
};

/**
 * Get all savings goals for a user
 */
export const getSavingsGoals = async (
  filters: SavingsGoalFilters
): Promise<ISavingsGoal[]> => {
  const query: any = {
    userId: filters.userId,
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  return await SavingsGoal.find(query)
    .populate('linkedAccountId')
    .populate('linkedWalletId')
    .sort({ createdAt: -1 });
};

/**
 * Get savings goal by ID
 */
export const getSavingsGoalById = async (
  goalId: string,
  userId: string
): Promise<ISavingsGoal | null> => {
  return await SavingsGoal.findOne({
    _id: goalId,
    userId,
  })
    .populate('linkedAccountId')
    .populate('linkedWalletId');
};

/**
 * Get contributions for a goal
 */
export const getContributions = async (
  goalId: string,
  userId: string
): Promise<ISavingsContribution[]> => {
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw new Error('Savings goal not found');
  }

  if (goal.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  return await SavingsContribution.find({ goalId })
    .populate('transactionId')
    .sort({ contributionDate: -1 });
};

/**
 * Cancel a savings goal
 */
export const cancelGoal = async (
  goalId: string,
  userId: string
): Promise<ISavingsGoal> => {
  const goal = await SavingsGoal.findById(goalId);
  if (!goal) {
    throw new Error('Savings goal not found');
  }

  if (goal.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  if (goal.status === 'completed') {
    throw new Error('Cannot cancel a completed goal');
  }

  goal.status = 'cancelled';
  await goal.save();

  return goal;
};

