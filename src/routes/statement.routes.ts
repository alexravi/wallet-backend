import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { uploadStatement } from '../middleware/upload.middleware';
import {
  uploadStatementHandler,
  parseStatementHandler,
  getParsedTransactionsHandler,
  editParsedTransactionHandler,
  confirmParsedTransactionsHandler,
} from '../controllers/statement.controller';

const router = Router();

// Validation rules
const uploadValidation = [
  body('bankAccountId').notEmpty().withMessage('Bank account ID is required'),
];

// Routes
router.post(
  '/upload',
  authenticate,
  validate(uploadValidation),
  uploadStatement.single('file'),
  uploadStatementHandler
);
router.post('/:id/parse', authenticate, parseStatementHandler);
router.get('/:id/transactions', authenticate, getParsedTransactionsHandler);
router.put('/:id/transactions/:transactionId', authenticate, editParsedTransactionHandler);
router.post('/:id/confirm', authenticate, confirmParsedTransactionsHandler);

export default router;

