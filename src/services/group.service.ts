import { Group, IGroup } from '../models/Group.model';
import { Transaction, ITransaction } from '../models/Transaction.model';
import { Person } from '../models/Person.model';

export interface CreateGroupData {
  userId: string;
  name: string;
  type: 'trip' | 'fees' | 'event' | 'custom';
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  currency: string;
  members: string[]; // Person IDs
  notes?: string;
}

export interface UpdateGroupData {
  name?: string;
  type?: 'trip' | 'fees' | 'event' | 'custom';
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  currency?: string;
  notes?: string;
  isActive?: boolean;
}

export interface GroupSummary {
  group: IGroup;
  totalSpent: number;
  transactionCount: number;
  perPersonShare: Array<{
    personId: string;
    personName: string;
    share: number;
    paid: number;
    balance: number; // positive = owes, negative = owed
  }>;
  budgetVsActual?: {
    budget: number;
    actual: number;
    difference: number;
    percentage: number;
  };
}

/**
 * Create a new group
 */
export const createGroup = async (data: CreateGroupData): Promise<IGroup> => {
  // Validate members exist
  if (data.members.length > 0) {
    const members = await Person.find({
      _id: { $in: data.members },
      userId: data.userId,
      isActive: true,
    });

    if (members.length !== data.members.length) {
      throw new Error('One or more members not found or inactive');
    }
  }

  // Validate dates
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    throw new Error('End date must be after start date');
  }

  const group = new Group({
    userId: data.userId,
    name: data.name,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate,
    budget: data.budget,
    currency: data.currency,
    members: data.members,
    notes: data.notes,
    isActive: true,
  });

  return await group.save();
};

/**
 * Update group
 */
export const updateGroup = async (
  groupId: string,
  userId: string,
  data: UpdateGroupData
): Promise<IGroup | null> => {
  const group = await Group.findOne({
    _id: groupId,
    userId,
  });

  if (!group) {
    return null;
  }

  // Validate dates
  const startDate = data.startDate ?? group.startDate;
  const endDate = data.endDate ?? group.endDate;
  if (startDate && endDate && endDate < startDate) {
    throw new Error('End date must be after start date');
  }

  Object.assign(group, data);
  return await group.save();
};

/**
 * Add member to group
 */
export const addGroupMember = async (
  groupId: string,
  userId: string,
  personId: string
): Promise<IGroup | null> => {
  const group = await Group.findOne({
    _id: groupId,
    userId,
  });

  if (!group) {
    return null;
  }

  // Validate person exists
  const person = await Person.findOne({
    _id: personId,
    userId,
    isActive: true,
  });

  if (!person) {
    throw new Error('Person not found or inactive');
  }

  // Check if already a member
  if (group.members.some(m => m.toString() === personId)) {
    return group; // Already a member
  }

  group.members.push(personId as any);
  return await group.save();
};

/**
 * Remove member from group
 */
export const removeGroupMember = async (
  groupId: string,
  userId: string,
  personId: string
): Promise<IGroup | null> => {
  const group = await Group.findOne({
    _id: groupId,
    userId,
  });

  if (!group) {
    return null;
  }

  group.members = group.members.filter(m => m.toString() !== personId);
  return await group.save();
};

/**
 * Get group transactions
 */
export const getGroupTransactions = async (
  groupId: string,
  userId: string
): Promise<ITransaction[]> => {
  return await Transaction.find({
    groupId,
    userId,
    deletedAt: null,
  })
    .populate('category', 'name icon color')
    .populate('personId', 'name')
    .sort({ date: -1, createdAt: -1 });
};

/**
 * Get group summary
 */
export const getGroupSummary = async (
  groupId: string,
  userId: string
): Promise<GroupSummary> => {
  const group = await Group.findOne({
    _id: groupId,
    userId,
  }).populate('members', 'name');

  if (!group) {
    throw new Error('Group not found');
  }

  // Get all transactions in group (including child transactions from splits)
  const transactions = await Transaction.find({
    $or: [
      { groupId, userId, deletedAt: null },
      { parentTransactionId: { $in: await Transaction.find({ groupId, userId, deletedAt: null }).distinct('_id') }, userId, deletedAt: null },
    ],
  });

  // Calculate total spent (only expenses)
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  const totalSpent = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Get people map
  const peopleMap = new Map<string, string>();
  const people = await Person.find({ userId, isActive: true });
  for (const person of people) {
    peopleMap.set(person._id.toString(), person.name);
  }

  // Calculate per-person share
  const perPersonShare = group.members.map((memberId) => {
    const memberIdStr = memberId.toString();
    const personName = peopleMap.get(memberIdStr) || 'Unknown';

    // Calculate what this person paid (transactions where they are the payer or child transaction person)
    const paid = transactions
      .filter(tx => {
        // Parent transaction paid by user (userId matches)
        if (!tx.parentTransactionId && tx.userId.toString() === userId) {
          return true;
        }
        // Child transaction assigned to this person
        if (tx.parentTransactionId && tx.personId?.toString() === memberIdStr) {
          return true;
        }
        return false;
      })
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate share (from split child transactions where this person is involved)
    const share = transactions
      .filter(tx => tx.parentTransactionId && tx.personId?.toString() === memberIdStr && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Balance: positive = owes money, negative = is owed money
    const balance = share - paid;

    return {
      personId: memberIdStr,
      personName,
      share: Math.round(share * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  });

  // Calculate budget vs actual if budget exists
  let budgetVsActual;
  if (group.budget) {
    const actual = Math.round(totalSpent * 100) / 100;
    const difference = Math.round((group.budget - actual) * 100) / 100;
    const percentage = group.budget > 0 ? Math.round((actual / group.budget) * 100) : 0;

    budgetVsActual = {
      budget: group.budget,
      actual,
      difference,
      percentage,
    };
  }

  return {
    group,
    totalSpent: Math.round(totalSpent * 100) / 100,
    transactionCount: transactions.length,
    perPersonShare,
    budgetVsActual,
  };
};

/**
 * Get all groups for user
 */
export const getGroups = async (
  userId: string,
  includeInactive: boolean = false
): Promise<IGroup[]> => {
  const query: any = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }

  return await Group.find(query)
    .populate('members', 'name')
    .sort({ createdAt: -1 });
};

/**
 * Get group by ID
 */
export const getGroupById = async (
  groupId: string,
  userId: string
): Promise<IGroup | null> => {
  return await Group.findOne({
    _id: groupId,
    userId,
  }).populate('members', 'name');
};

/**
 * Delete group (soft delete by setting isActive to false)
 */
export const deleteGroup = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  const group = await Group.findOne({
    _id: groupId,
    userId,
  });

  if (!group) {
    return false;
  }

  group.isActive = false;
  await group.save();
  return true;
};

