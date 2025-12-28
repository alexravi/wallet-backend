import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  createLoanHandler,
  getLoansHandler,
  getLoanByIdHandler,
  recordPaymentHandler,
  closeLoanHandler,
  updateLoanHandler,
} from '../controllers/loan.controller';

const router = Router();

// Validation rules
const createLoanValidation = [
  body('loanType')
    .isIn(['borrowed', 'given', 'hand'])
    .withMessage('Loan type must be borrowed, given, or hand'),
  body('loanCategory')
    .isIn(['bank', 'cash'])
    .withMessage('Loan category must be bank or cash'),
  body('principal')
    .isFloat({ min: 0.01 })
    .withMessage('Principal must be a positive number'),
  body('interestType')
    .optional()
    .isIn(['flat', 'simple', 'compound'])
    .withMessage('Interest type must be flat, simple, or compound'),
  body('interestRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Interest rate must be between 0 and 100'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('linkedPersonId')
    .optional()
    .isMongoId()
    .withMessage('Linked person ID must be a valid MongoDB ID'),
  body('linkedAccountId')
    .optional()
    .isMongoId()
    .withMessage('Linked account ID must be a valid MongoDB ID'),
  body('linkedWalletId')
    .optional()
    .isMongoId()
    .withMessage('Linked wallet ID must be a valid MongoDB ID'),
  body('currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('numberOfEMIs')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of EMIs must be a positive integer'),
];

const recordPaymentValidation = [
  body('paymentType')
    .isIn(['emi', 'partial', 'prepayment', 'irregular'])
    .withMessage('Payment type must be emi, partial, prepayment, or irregular'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('principalAmount')
    .isFloat({ min: 0 })
    .withMessage('Principal amount must be a non-negative number'),
  body('interestAmount')
    .isFloat({ min: 0 })
    .withMessage('Interest amount must be a non-negative number'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid date'),
  body('emiScheduleId')
    .optional()
    .isMongoId()
    .withMessage('EMI schedule ID must be a valid MongoDB ID'),
];

const updateLoanValidation = [
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
];

// Loan Routes
router.post('/', authenticate, validate(createLoanValidation), createLoanHandler);
router.get('/', authenticate, getLoansHandler);
router.get('/:id', authenticate, getLoanByIdHandler);
router.post('/:id/payments', authenticate, validate(recordPaymentValidation), recordPaymentHandler);
router.patch('/:id/close', authenticate, closeLoanHandler);
router.put('/:id', authenticate, validate(updateLoanValidation), updateLoanHandler);

export default router;

