import { Person, IPerson, ICategoryLimit } from '../models/Person.model';
import { Transaction } from '../models/Transaction.model';
import mongoose from 'mongoose';

export interface CreatePersonData {
  userId: string;
  name: string;
  type: 'child' | 'friend' | 'employee' | 'family' | 'other';
  notes?: string;
  overallLimit?: number;
  limitPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  categoryLimits?: ICategoryLimit[];
}

export interface UpdatePersonData {
  name?: string;
  type?: 'child' | 'friend' | 'employee' | 'family' | 'other';
  notes?: string;
  overallLimit?: number;
  limitPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  categoryLimits?: ICategoryLimit[];
}

export interface SpendingSummary {
  total: number;
  byCategory: Array<{
    categoryId: string;
    categoryName?: string;
    amount: number;
  }>;
  byPeriod: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface LimitStatus {
  overallLimit?: {
    limit: number;
    spent: number;
    remaining: number;
    period: string;
    isBreached: boolean;
    percentage: number;
  };
  categoryLimits: Array<{
    categoryId: string;
    categoryName?: string;
    limit: number;
    spent: number;
    remaining: number;
    period: string;
    isBreached: boolean;
    percentage: number;
  }>;
}

/**
 * Create a person
 */
export const createPerson = async (data: CreatePersonData): Promise<IPerson> => {
  // Check if person with same name exists for user
  const existing = await Person.findOne({
    userId: data.userId,
    name: data.name.trim(),
    isActive: true,
  });

  if (existing) {
    throw new Error('Person with this name already exists');
  }

  const person = new Person({
    ...data,
    name: data.name.trim(),
    isActive: true,
  });

  return await person.save();
};

/**
 * Get all people for a user
 */
export const getPeople = async (userId: string, includeInactive: boolean = false): Promise<IPerson[]> => {
  const query: any = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }

  return await Person.find(query).sort({ name: 1 });
};

/**
 * Get person by ID
 */
export const getPersonById = async (personId: string, userId: string): Promise<IPerson | null> => {
  return await Person.findOne({
    _id: personId,
    userId,
  });
};

/**
 * Update person
 */
export const updatePerson = async (
  personId: string,
  userId: string,
  data: UpdatePersonData
): Promise<IPerson | null> => {
  const person = await Person.findOne({
    _id: personId,
    userId,
  });

  if (!person) {
    return null;
  }

  // Check name uniqueness if name is being changed
  if (data.name && data.name.trim() !== person.name) {
    const existing = await Person.findOne({
      userId,
      name: data.name.trim(),
      isActive: true,
      _id: { $ne: personId },
    });

    if (existing) {
      throw new Error('Person with this name already exists');
    }
  }

  Object.assign(person, data);
  if (data.name) {
    person.name = data.name.trim();
  }

  return await person.save();
};

/**
 * Delete person (soft delete by setting isActive to false)
 */
export const deletePerson = async (personId: string, userId: string): Promise<boolean> => {
  const person = await Person.findOne({
    _id: personId,
    userId,
  });

  if (!person) {
    return false;
  }

  person.isActive = false;
  await person.save();

  // Optionally remove personId from transactions
  // For now, we'll keep the reference for historical data

  return true;
};

/**
 * Get spending summary for a person
 */
export const getPersonSpendingSummary = async (
  personId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SpendingSummary> => {
  const person = await Person.findOne({
    _id: personId,
    userId,
  });

  if (!person) {
    throw new Error('Person not found');
  }

  // Default to current month if no dates provided
  const now = new Date();
  const periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Build date query
  const dateQuery: any = {
    userId,
    personId: new mongoose.Types.ObjectId(personId),
    deletedAt: null,
    type: 'expense', // Only expenses count towards spending
    date: {
      $gte: periodStart,
      $lte: periodEnd,
    },
  };

  // Get all transactions for this person in the period
  const transactions = await Transaction.find(dateQuery);

  // Calculate totals
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Group by category
  const categoryMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.category) {
      const catId = typeof tx.category === 'string' ? tx.category : tx.category.toString();
      categoryMap.set(catId, (categoryMap.get(catId) || 0) + tx.amount);
    }
  }

  const byCategory = Array.from(categoryMap.entries()).map(([categoryId, amount]) => ({
    categoryId,
    amount,
  }));

  // Calculate by period (last 30 days, last 7 days, etc.)
  const today = new Date();
  const dailyStart = new Date(today);
  dailyStart.setHours(0, 0, 0, 0);

  const weeklyStart = new Date(today);
  weeklyStart.setDate(today.getDate() - 7);

  const monthlyStart = new Date(today);
  monthlyStart.setMonth(today.getMonth() - 1);

  const yearlyStart = new Date(today);
  yearlyStart.setFullYear(today.getFullYear() - 1);

  const dailyTransactions = await Transaction.find({
    ...dateQuery,
    date: { $gte: dailyStart },
  });
  const daily = dailyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const weeklyTransactions = await Transaction.find({
    ...dateQuery,
    date: { $gte: weeklyStart },
  });
  const weekly = weeklyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyTransactions = await Transaction.find({
    ...dateQuery,
    date: { $gte: monthlyStart },
  });
  const monthly = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  const yearlyTransactions = await Transaction.find({
    ...dateQuery,
    date: { $gte: yearlyStart },
  });
  const yearly = yearlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return {
    total,
    byCategory,
    byPeriod: {
      daily,
      weekly,
      monthly,
      yearly,
    },
    period: {
      startDate: periodStart,
      endDate: periodEnd,
    },
  };
};

/**
 * Check spending limits for a person
 */
export const checkPersonLimits = async (
  personId: string,
  userId: string,
  transactionAmount: number,
  categoryId?: string
): Promise<LimitStatus> => {
  const person = await Person.findOne({
    _id: personId,
    userId,
  });

  if (!person) {
    throw new Error('Person not found');
  }

  const limitStatus: LimitStatus = {
    categoryLimits: [],
  };

  // Check overall limit
  if (person.overallLimit && person.limitPeriod) {
    const periodStart = getPeriodStart(new Date(), person.limitPeriod);
    const periodEnd = getPeriodEnd(new Date(), person.limitPeriod);

    const spent = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          personId: new mongoose.Types.ObjectId(personId),
          deletedAt: null,
          type: 'expense',
          date: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalSpent = spent[0]?.total || 0;
    const projectedSpent = totalSpent + transactionAmount;
    const remaining = Math.max(0, person.overallLimit - projectedSpent);
    const isBreached = projectedSpent > person.overallLimit;

    limitStatus.overallLimit = {
      limit: person.overallLimit,
      spent: totalSpent,
      remaining,
      period: person.limitPeriod,
      isBreached,
      percentage: (projectedSpent / person.overallLimit) * 100,
    };
  }

  // Check category limits
  if (person.categoryLimits && person.categoryLimits.length > 0) {
    for (const catLimit of person.categoryLimits) {
      // Only check the category limit if it matches the transaction category
      if (categoryId && catLimit.categoryId.toString() !== categoryId) {
        continue;
      }

      const periodStart = getPeriodStart(new Date(), catLimit.period);
      const periodEnd = getPeriodEnd(new Date(), catLimit.period);

      const spent = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            personId: new mongoose.Types.ObjectId(personId),
            category: new mongoose.Types.ObjectId(catLimit.categoryId),
            deletedAt: null,
            type: 'expense',
            date: { $gte: periodStart, $lte: periodEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const totalSpent = spent[0]?.total || 0;
      const projectedSpent = totalSpent + (categoryId === catLimit.categoryId.toString() ? transactionAmount : 0);
      const remaining = Math.max(0, catLimit.amount - projectedSpent);
      const isBreached = projectedSpent > catLimit.amount;

      limitStatus.categoryLimits.push({
        categoryId: catLimit.categoryId.toString(),
        limit: catLimit.amount,
        spent: totalSpent,
        remaining,
        period: catLimit.period,
        isBreached,
        percentage: (projectedSpent / catLimit.amount) * 100,
      });
    }
  }

  return limitStatus;
};

/**
 * Helper function to get period start date
 */
function getPeriodStart(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Date {
  const start = new Date(date);
  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yearly':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return start;
}

/**
 * Helper function to get period end date
 */
function getPeriodEnd(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): Date {
  const end = new Date(date);
  switch (period) {
    case 'daily':
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = end.getDay();
      end.setDate(end.getDate() + (6 - dayOfWeek));
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }
  return end;
}

