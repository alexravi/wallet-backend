import { CashWallet } from '../models/CashWallet.model';
import { Transaction } from '../models/Transaction.model';
import {
  createTransaction,
  CreateTransactionData,
  getTransactions,
} from './transaction.service';
import {
  updateCashWalletBalance,
  getCashWalletById,
  updateBankAccountBalance,
  getBankAccountById,
} from './account.service';
import { BankAccount } from '../models/BankAccount.model';

export interface CashInData {
  walletId: string;
  userId: string;
  amount: number;
  description: string;
  date: Date;
  currency: string;
  category?: string;
}

export interface CashOutData {
  walletId: string;
  userId: string;
  amount: number;
  description: string;
  date: Date;
  currency: string;
  category?: string;
}

export interface TransferData {
  fromAccountId: string;
  fromAccountType: 'bank' | 'cash';
  toAccountId: string;
  toAccountType: 'bank' | 'cash';
  userId: string;
  amount: number;
  description: string;
  date: Date;
  currency: string;
  category?: string;
}

export interface ReconciliationData {
  walletId: string;
  userId: string;
  month: number; // 0-11
  year: number;
}

/**
 * Cash in operation - Add money to wallet
 */
export const cashIn = async (data: CashInData) => {
  const wallet = await getCashWalletById(data.walletId, data.userId);
  if (!wallet) {
    throw new Error('Cash wallet not found');
  }

  if (wallet.currency !== data.currency) {
    throw new Error('Currency mismatch');
  }

  // Create income transaction
  const transactionData: CreateTransactionData = {
    userId: data.userId,
    accountId: data.walletId,
    accountType: 'cash',
    type: 'income',
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    category: data.category,
    date: data.date,
  };

  const transaction = await createTransaction(transactionData);

  // Update wallet balance
  await updateCashWalletBalance(data.walletId, data.amount);

  return {
    transaction,
    wallet: await getCashWalletById(data.walletId, data.userId),
  };
};

/**
 * Cash out operation - Remove money from wallet
 */
export const cashOut = async (data: CashOutData) => {
  const wallet = await getCashWalletById(data.walletId, data.userId);
  if (!wallet) {
    throw new Error('Cash wallet not found');
  }

  if (wallet.currency !== data.currency) {
    throw new Error('Currency mismatch');
  }

  if (wallet.currentBalance < data.amount) {
    throw new Error('Insufficient balance');
  }

  // Create expense transaction
  const transactionData: CreateTransactionData = {
    userId: data.userId,
    accountId: data.walletId,
    accountType: 'cash',
    type: 'expense',
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    category: data.category,
    date: data.date,
  };

  const transaction = await createTransaction(transactionData);

  // Update wallet balance
  await updateCashWalletBalance(data.walletId, -data.amount);

  return {
    transaction,
    wallet: await getCashWalletById(data.walletId, data.userId),
  };
};

/**
 * Transfer between accounts (bank or cash)
 */
export const transferBetweenAccounts = async (data: TransferData) => {
  // Verify from account
  let fromAccount;
  if (data.fromAccountType === 'bank') {
    fromAccount = await getBankAccountById(data.fromAccountId, data.userId);
  } else {
    fromAccount = await getCashWalletById(data.fromAccountId, data.userId);
  }

  if (!fromAccount) {
    throw new Error('Source account not found');
  }

  if (fromAccount.currentBalance < data.amount) {
    throw new Error('Insufficient balance in source account');
  }

  // Verify to account
  let toAccount;
  if (data.toAccountType === 'bank') {
    toAccount = await getBankAccountById(data.toAccountId, data.userId);
  } else {
    toAccount = await getCashWalletById(data.toAccountId, data.userId);
  }

  if (!toAccount) {
    throw new Error('Destination account not found');
  }

  if (fromAccount.currency !== data.currency || toAccount.currency !== data.currency) {
    throw new Error('Currency mismatch');
  }

  // Create two transactions: expense from source, income to destination
  const fromTransactionData: CreateTransactionData = {
    userId: data.userId,
    accountId: data.fromAccountId,
    accountType: data.fromAccountType,
    type: 'transfer',
    amount: data.amount,
    currency: data.currency,
    description: `Transfer to ${data.toAccountType === 'bank' ? 'Bank' : 'Cash'}: ${data.description}`,
    category: data.category,
    date: data.date,
    transferToAccountId: data.toAccountId,
  };

  const toTransactionData: CreateTransactionData = {
    userId: data.userId,
    accountId: data.toAccountId,
    accountType: data.toAccountType,
    type: 'transfer',
    amount: data.amount,
    currency: data.currency,
    description: `Transfer from ${data.fromAccountType === 'bank' ? 'Bank' : 'Cash'}: ${data.description}`,
    category: data.category,
    date: data.date,
    transferToAccountId: data.fromAccountId,
  };

  const fromTransaction = await createTransaction(fromTransactionData);
  const toTransaction = await createTransaction(toTransactionData);

  // Update balances
  if (data.fromAccountType === 'bank') {
    await updateBankAccountBalance(data.fromAccountId, -data.amount);
  } else {
    await updateCashWalletBalance(data.fromAccountId, -data.amount);
  }

  if (data.toAccountType === 'bank') {
    await updateBankAccountBalance(data.toAccountId, data.amount);
  } else {
    await updateCashWalletBalance(data.toAccountId, data.amount);
  }

  return {
    fromTransaction,
    toTransaction,
    fromAccount: data.fromAccountType === 'bank'
      ? await getBankAccountById(data.fromAccountId, data.userId)
      : await getCashWalletById(data.fromAccountId, data.userId),
    toAccount: data.toAccountType === 'bank'
      ? await getBankAccountById(data.toAccountId, data.userId)
      : await getCashWalletById(data.toAccountId, data.userId),
  };
};

/**
 * Monthly reconciliation for cash wallet
 */
export const monthlyReconciliation = async (data: ReconciliationData) => {
  const wallet = await getCashWalletById(data.walletId, data.userId);
  if (!wallet) {
    throw new Error('Cash wallet not found');
  }

  // Calculate date range for the month
  const startDate = new Date(data.year, data.month, 1);
  const endDate = new Date(data.year, data.month + 1, 0, 23, 59, 59, 999);

  // Get all transactions for the month
  const { transactions } = await getTransactions({
    userId: data.userId,
    accountId: data.walletId,
    accountType: 'cash',
    startDate,
    endDate,
  });

  // Calculate expected balance
  let expectedBalance = wallet.openingBalance;
  let totalCashIn = 0;
  let totalCashOut = 0;
  let totalTransfersIn = 0;
  let totalTransfersOut = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      expectedBalance += tx.amount;
      totalCashIn += tx.amount;
    } else if (tx.type === 'expense') {
      expectedBalance -= tx.amount;
      totalCashOut += tx.amount;
    } else if (tx.type === 'transfer') {
      if (tx.accountId.toString() === data.walletId && tx.transferToAccountId) {
        // Money coming into this wallet
        expectedBalance += tx.amount;
        totalTransfersIn += tx.amount;
      } else if (tx.transferToAccountId?.toString() === data.walletId) {
        // Money going out from this wallet
        expectedBalance -= tx.amount;
        totalTransfersOut += tx.amount;
      }
    }
  }

  const actualBalance = wallet.currentBalance;
  const discrepancy = actualBalance - expectedBalance;

  return {
    wallet,
    month: data.month,
    year: data.year,
    openingBalance: wallet.openingBalance,
    expectedBalance,
    actualBalance,
    discrepancy,
    transactions,
    summary: {
      totalCashIn,
      totalCashOut,
      totalTransfersIn,
      totalTransfersOut,
      transactionCount: transactions.length,
    },
  };
};

