import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  createBankAccountHandler,
  getBankAccountsHandler,
  getBankAccountByIdHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  createCashWalletHandler,
  getCashWalletsHandler,
  getCashWalletByIdHandler,
  updateCashWalletHandler,
  archiveCashWalletHandler,
  getAllAccountsHandler,
} from '../controllers/account.controller';

const router = Router();

// Validation rules
const bankAccountValidation = [
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('accountType')
    .isIn(['savings', 'checking', 'current'])
    .withMessage('Account type must be savings, checking, or current'),
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('Opening balance must be a positive number'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
];

const cashWalletValidation = [
  body('name').notEmpty().withMessage('Wallet name is required'),
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('Opening balance must be a positive number'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
];

// Bank Account Routes
router.post('/bank', authenticate, validate(bankAccountValidation), createBankAccountHandler);
router.get('/bank', authenticate, getBankAccountsHandler);
router.get('/bank/:id', authenticate, getBankAccountByIdHandler);
router.put('/bank/:id', authenticate, validate(bankAccountValidation), updateBankAccountHandler);
router.delete('/bank/:id', authenticate, archiveBankAccountHandler);

// Cash Wallet Routes
router.post('/cash', authenticate, validate(cashWalletValidation), createCashWalletHandler);
router.get('/cash', authenticate, getCashWalletsHandler);
router.get('/cash/:id', authenticate, getCashWalletByIdHandler);
router.put('/cash/:id', authenticate, validate(cashWalletValidation), updateCashWalletHandler);
router.delete('/cash/:id', authenticate, archiveCashWalletHandler);

// Get All Accounts (for transfers)
router.get('/all', authenticate, getAllAccountsHandler);

export default router;

