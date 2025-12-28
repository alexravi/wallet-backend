import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  createSavingsGoalHandler,
  getSavingsGoalsHandler,
  getSavingsGoalByIdHandler,
  addContributionHandler,
  getContributionsHandler,
  pauseGoalHandler,
  resumeGoalHandler,
  getDeviationAlertsHandler,
  cancelGoalHandler,
} from '../controllers/savings.controller';

const router = Router();

// Validation rules
const createSavingsGoalValidation = [
  body('goalName')
    .notEmpty()
    .withMessage('Goal name is required'),
  body('targetAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Target amount must be a positive number'),
  body('targetDate')
    .optional()
    .isISO8601()
    .withMessage('Target date must be a valid date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('linkedAccountId')
    .optional()
    .isMongoId()
    .withMessage('Linked account ID must be a valid MongoDB ID'),
  body('linkedWalletId')
    .optional()
    .isMongoId()
    .withMessage('Linked wallet ID must be a valid MongoDB ID'),
  body('accountType')
    .optional()
    .isIn(['bank', 'cash', 'all'])
    .withMessage('Account type must be bank, cash, or all'),
  body('currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  body('autoContribution')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Auto contribution must be a non-negative number'),
];

const addContributionValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('contributionDate')
    .optional()
    .isISO8601()
    .withMessage('Contribution date must be a valid date'),
  body('sourceAccountId')
    .optional()
    .isMongoId()
    .withMessage('Source account ID must be a valid MongoDB ID'),
  body('sourceAccountType')
    .optional()
    .isIn(['bank', 'cash'])
    .withMessage('Source account type must be bank or cash'),
  body('createTransaction')
    .optional()
    .isBoolean()
    .withMessage('Create transaction must be a boolean'),
];

// Savings Goal Routes
router.post('/goals', authenticate, validate(createSavingsGoalValidation), createSavingsGoalHandler);
router.get('/goals', authenticate, getSavingsGoalsHandler);
router.get('/goals/:id', authenticate, getSavingsGoalByIdHandler);
router.post('/goals/:id/contributions', authenticate, validate(addContributionValidation), addContributionHandler);
router.get('/goals/:id/contributions', authenticate, getContributionsHandler);
router.patch('/goals/:id/pause', authenticate, pauseGoalHandler);
router.patch('/goals/:id/resume', authenticate, resumeGoalHandler);
router.get('/goals/:id/alerts', authenticate, getDeviationAlertsHandler);
router.delete('/goals/:id', authenticate, cancelGoalHandler);

export default router;

