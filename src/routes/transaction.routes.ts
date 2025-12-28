import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  createTransactionHandler,
  getTransactionsHandler,
  getDailyTransactionsHandler,
  getTransactionByIdHandler,
  updateTransactionHandler,
  deleteTransactionHandler,
  restoreTransactionHandler,
  checkDuplicatesHandler,
} from '../controllers/transaction.controller';

const router = Router();

// Validation rules
const createTransactionValidation = [
  body('accountId').notEmpty().withMessage('Account ID is required'),
  body('accountType').isIn(['bank', 'cash']).withMessage('Account type must be bank or cash'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense, or transfer'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').notEmpty().withMessage('Description is required'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
];

// Routes
router.post('/', authenticate, validate(createTransactionValidation), createTransactionHandler);
router.get('/daily', authenticate, getDailyTransactionsHandler);
router.get('/', authenticate, getTransactionsHandler);
router.get('/:id', authenticate, getTransactionByIdHandler);
router.put('/:id', authenticate, updateTransactionHandler);
router.delete('/:id', authenticate, deleteTransactionHandler);
router.post('/:id/restore', authenticate, restoreTransactionHandler);
router.post('/check-duplicates', authenticate, checkDuplicatesHandler);

export default router;

