import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  cashInHandler,
  cashOutHandler,
  transferHandler,
  getReconciliationHandler,
  completeReconciliationHandler,
} from '../controllers/cash-operation.controller';

const router = Router();

// Validation rules
const cashInValidation = [
  body('walletId').notEmpty().withMessage('Wallet ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').notEmpty().withMessage('Description is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
];

const cashOutValidation = [
  body('walletId').notEmpty().withMessage('Wallet ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').notEmpty().withMessage('Description is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
];

const transferValidation = [
  body('fromAccountId').notEmpty().withMessage('From account ID is required'),
  body('fromAccountType').isIn(['bank', 'cash']).withMessage('From account type must be bank or cash'),
  body('toAccountId').notEmpty().withMessage('To account ID is required'),
  body('toAccountType').isIn(['bank', 'cash']).withMessage('To account type must be bank or cash'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').notEmpty().withMessage('Description is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
];

// Routes
router.post('/in', authenticate, validate(cashInValidation), cashInHandler);
router.post('/out', authenticate, validate(cashOutValidation), cashOutHandler);
router.post('/transfer', authenticate, validate(transferValidation), transferHandler);
router.get('/reconciliation/:walletId', authenticate, getReconciliationHandler);
router.post('/reconciliation/:walletId', authenticate, completeReconciliationHandler);

export default router;

