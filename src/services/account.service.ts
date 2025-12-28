import { BankAccount, IBankAccount } from '../models/BankAccount.model';
import { CashWallet, ICashWallet } from '../models/CashWallet.model';
import mongoose from 'mongoose';

export interface CreateBankAccountData {
  userId: string;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'checking' | 'current';
  branchName?: string;
  ifscCode?: string;
  openingBalance: number;
  currency: string;
}

export interface UpdateBankAccountData {
  bankName?: string;
  accountNumber?: string;
  accountType?: 'savings' | 'checking' | 'current';
  branchName?: string;
  ifscCode?: string;
  openingBalance?: number;
  currency?: string;
}

export interface CreateCashWalletData {
  userId: string;
  name: string;
  openingBalance: number;
  currency: string;
  color?: string;
  icon?: string;
}

export interface UpdateCashWalletData {
  name?: string;
  openingBalance?: number;
  currency?: string;
  color?: string;
  icon?: string;
}

/**
 * Create a new bank account
 */
export const createBankAccount = async (
  data: CreateBankAccountData
): Promise<IBankAccount> => {
  const account = new BankAccount({
    ...data,
    currentBalance: data.openingBalance,
    status: 'active',
    isManual: true,
  });

  return await account.save();
};

/**
 * Get all bank accounts for a user
 */
export const getBankAccounts = async (
  userId: string,
  includeArchived: boolean = false
): Promise<IBankAccount[]> => {
  const query: any = { userId };
  if (!includeArchived) {
    query.status = 'active';
  }

  return await BankAccount.find(query).sort({ createdAt: -1 });
};

/**
 * Get bank account by ID
 */
export const getBankAccountById = async (
  accountId: string,
  userId: string
): Promise<IBankAccount | null> => {
  return await BankAccount.findOne({
    _id: accountId,
    userId,
  });
};

/**
 * Update bank account
 */
export const updateBankAccount = async (
  accountId: string,
  userId: string,
  data: UpdateBankAccountData
): Promise<IBankAccount | null> => {
  const account = await BankAccount.findOne({
    _id: accountId,
    userId,
  });

  if (!account) {
    return null;
  }

  // If openingBalance changes, adjust currentBalance accordingly
  if (data.openingBalance !== undefined && data.openingBalance !== account.openingBalance) {
    const balanceDiff = data.openingBalance - account.openingBalance;
    account.currentBalance = account.currentBalance + balanceDiff;
    account.openingBalance = data.openingBalance;
  }

  Object.assign(account, data);
  return await account.save();
};

/**
 * Archive a bank account
 */
export const archiveBankAccount = async (
  accountId: string,
  userId: string
): Promise<boolean> => {
  const result = await BankAccount.updateOne(
    {
      _id: accountId,
      userId,
    },
    {
      status: 'archived',
    }
  );

  return result.modifiedCount > 0;
};

/**
 * Update bank account balance
 */
export const updateBankAccountBalance = async (
  accountId: string,
  amount: number
): Promise<IBankAccount | null> => {
  const account = await BankAccount.findById(accountId);
  if (!account) {
    return null;
  }

  account.currentBalance += amount;
  return await account.save();
};

/**
 * Create a new cash wallet
 */
export const createCashWallet = async (
  data: CreateCashWalletData
): Promise<ICashWallet> => {
  const wallet = new CashWallet({
    ...data,
    currentBalance: data.openingBalance,
    status: 'active',
  });

  return await wallet.save();
};

/**
 * Get all cash wallets for a user
 */
export const getCashWallets = async (
  userId: string,
  includeArchived: boolean = false
): Promise<ICashWallet[]> => {
  const query: any = { userId };
  if (!includeArchived) {
    query.status = 'active';
  }

  return await CashWallet.find(query).sort({ createdAt: -1 });
};

/**
 * Get cash wallet by ID
 */
export const getCashWalletById = async (
  walletId: string,
  userId: string
): Promise<ICashWallet | null> => {
  return await CashWallet.findOne({
    _id: walletId,
    userId,
  });
};

/**
 * Update cash wallet
 */
export const updateCashWallet = async (
  walletId: string,
  userId: string,
  data: UpdateCashWalletData
): Promise<ICashWallet | null> => {
  const wallet = await CashWallet.findOne({
    _id: walletId,
    userId,
  });

  if (!wallet) {
    return null;
  }

  // If openingBalance changes, adjust currentBalance accordingly
  if (data.openingBalance !== undefined && data.openingBalance !== wallet.openingBalance) {
    const balanceDiff = data.openingBalance - wallet.openingBalance;
    wallet.currentBalance = wallet.currentBalance + balanceDiff;
    wallet.openingBalance = data.openingBalance;
  }

  Object.assign(wallet, data);
  return await wallet.save();
};

/**
 * Archive a cash wallet
 */
export const archiveCashWallet = async (
  walletId: string,
  userId: string
): Promise<boolean> => {
  const result = await CashWallet.updateOne(
    {
      _id: walletId,
      userId,
    },
    {
      status: 'archived',
    }
  );

  return result.modifiedCount > 0;
};

/**
 * Update cash wallet balance
 */
export const updateCashWalletBalance = async (
  walletId: string,
  amount: number
): Promise<ICashWallet | null> => {
  const wallet = await CashWallet.findById(walletId);
  if (!wallet) {
    return null;
  }

  wallet.currentBalance += amount;
  return await wallet.save();
};

/**
 * Get all accounts (bank + cash) for a user
 * Used for transfer operations
 */
export const getAllAccounts = async (
  userId: string,
  includeArchived: boolean = false
): Promise<Array<{
  id: string;
  name: string;
  type: 'bank' | 'cash';
  balance: number;
  currency: string;
}>> => {
  const [bankAccounts, cashWallets] = await Promise.all([
    getBankAccounts(userId, includeArchived),
    getCashWallets(userId, includeArchived),
  ]);

  const accounts = [
    ...bankAccounts.map((acc) => ({
      id: acc._id.toString(),
      name: `${acc.bankName} - ${acc.accountNumber}`,
      type: 'bank' as const,
      balance: acc.currentBalance,
      currency: acc.currency,
    })),
    ...cashWallets.map((wallet) => ({
      id: wallet._id.toString(),
      name: wallet.name,
      type: 'cash' as const,
      balance: wallet.currentBalance,
      currency: wallet.currency,
    })),
  ];

  return accounts;
};

