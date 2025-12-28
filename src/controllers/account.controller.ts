import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createBankAccount,
  getBankAccounts,
  getBankAccountById,
  updateBankAccount,
  archiveBankAccount,
  createCashWallet,
  getCashWallets,
  getCashWalletById,
  updateCashWallet,
  archiveCashWallet,
  getAllAccounts,
  CreateBankAccountData,
  UpdateBankAccountData,
  CreateCashWalletData,
  UpdateCashWalletData,
} from '../services/account.service';

/**
 * Create a new bank account
 */
export const createBankAccountHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateBankAccountData = {
      userId,
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      accountType: req.body.accountType,
      branchName: req.body.branchName,
      ifscCode: req.body.ifscCode,
      openingBalance: req.body.openingBalance || 0,
      currency: req.body.currency || 'INR',
    };

    const account = await createBankAccount(data);
    res.status(201).json({
      message: 'Bank account created successfully',
      data: account,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create bank account',
    });
  }
};

/**
 * Get all bank accounts for user
 */
export const getBankAccountsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const includeArchived = req.query.includeArchived === 'true';
    const accounts = await getBankAccounts(userId, includeArchived);
    res.json({
      message: 'Bank accounts retrieved successfully',
      data: accounts,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve bank accounts',
    });
  }
};

/**
 * Get bank account by ID
 */
export const getBankAccountByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accountId = req.params.id;
    const account = await getBankAccountById(accountId, userId);

    if (!account) {
      return res.status(404).json({
        error: 'Bank account not found',
      });
    }

    res.json({
      message: 'Bank account retrieved successfully',
      data: account,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve bank account',
    });
  }
};

/**
 * Update bank account
 */
export const updateBankAccountHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accountId = req.params.id;
    const data: UpdateBankAccountData = {
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      accountType: req.body.accountType,
      branchName: req.body.branchName,
      ifscCode: req.body.ifscCode,
      openingBalance: req.body.openingBalance,
      currency: req.body.currency,
    };

    // Remove undefined fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateBankAccountData] === undefined) {
        delete data[key as keyof UpdateBankAccountData];
      }
    });

    const account = await updateBankAccount(accountId, userId, data);

    if (!account) {
      return res.status(404).json({
        error: 'Bank account not found',
      });
    }

    res.json({
      message: 'Bank account updated successfully',
      data: account,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to update bank account',
    });
  }
};

/**
 * Archive bank account
 */
export const archiveBankAccountHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accountId = req.params.id;
    const success = await archiveBankAccount(accountId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Bank account not found',
      });
    }

    res.json({
      message: 'Bank account archived successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to archive bank account',
    });
  }
};

/**
 * Create a new cash wallet
 */
export const createCashWalletHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateCashWalletData = {
      userId,
      name: req.body.name,
      openingBalance: req.body.openingBalance || 0,
      currency: req.body.currency || 'INR',
      color: req.body.color,
      icon: req.body.icon,
    };

    const wallet = await createCashWallet(data);
    res.status(201).json({
      message: 'Cash wallet created successfully',
      data: wallet,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create cash wallet',
    });
  }
};

/**
 * Get all cash wallets for user
 */
export const getCashWalletsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const includeArchived = req.query.includeArchived === 'true';
    const wallets = await getCashWallets(userId, includeArchived);
    res.json({
      message: 'Cash wallets retrieved successfully',
      data: wallets,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve cash wallets',
    });
  }
};

/**
 * Get cash wallet by ID
 */
export const getCashWalletByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletId = req.params.id;
    const wallet = await getCashWalletById(walletId, userId);

    if (!wallet) {
      return res.status(404).json({
        error: 'Cash wallet not found',
      });
    }

    res.json({
      message: 'Cash wallet retrieved successfully',
      data: wallet,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve cash wallet',
    });
  }
};

/**
 * Update cash wallet
 */
export const updateCashWalletHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletId = req.params.id;
    const data: UpdateCashWalletData = {
      name: req.body.name,
      openingBalance: req.body.openingBalance,
      currency: req.body.currency,
      color: req.body.color,
      icon: req.body.icon,
    };

    // Remove undefined fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateCashWalletData] === undefined) {
        delete data[key as keyof UpdateCashWalletData];
      }
    });

    const wallet = await updateCashWallet(walletId, userId, data);

    if (!wallet) {
      return res.status(404).json({
        error: 'Cash wallet not found',
      });
    }

    res.json({
      message: 'Cash wallet updated successfully',
      data: wallet,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to update cash wallet',
    });
  }
};

/**
 * Archive cash wallet
 */
export const archiveCashWalletHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const walletId = req.params.id;
    const success = await archiveCashWallet(walletId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Cash wallet not found',
      });
    }

    res.json({
      message: 'Cash wallet archived successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to archive cash wallet',
    });
  }
};

/**
 * Get all accounts (bank + cash) for user
 */
export const getAllAccountsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const includeArchived = req.query.includeArchived === 'true';
    const accounts = await getAllAccounts(userId, includeArchived);
    res.json({
      message: 'Accounts retrieved successfully',
      data: accounts,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve accounts',
    });
  }
};

