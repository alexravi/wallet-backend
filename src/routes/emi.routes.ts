import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateEMIScheduleHandler,
  regenerateEMIScheduleHandler,
  getEMIScheduleHandler,
  markEMIPaidHandler,
  detectMissedEMIsHandler,
  getMissedEMIsHandler,
  handleEarlyClosureHandler,
  getUpcomingEMIsHandler,
} from '../controllers/emi.controller';

const router = Router();

// Validation rules
const generateEMIScheduleValidation = [
  body('numberOfEMIs')
    .isInt({ min: 1 })
    .withMessage('Number of EMIs must be a positive integer'),
  body('emiAmount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('EMI amount must be a positive number'),
];

const markEMIPaidValidation = [
  body('paymentId')
    .isMongoId()
    .withMessage('Payment ID must be a valid MongoDB ID'),
  body('paidDate')
    .optional()
    .isISO8601()
    .withMessage('Paid date must be a valid date'),
];

const earlyClosureValidation = [
  body('closureDate')
    .optional()
    .isISO8601()
    .withMessage('Closure date must be a valid date'),
];

// EMI Routes
router.post('/loans/:id/schedule', authenticate, validate(generateEMIScheduleValidation), generateEMIScheduleHandler);
router.put('/loans/:id/schedule', authenticate, validate(generateEMIScheduleValidation), regenerateEMIScheduleHandler);
router.get('/loans/:id/schedule', authenticate, getEMIScheduleHandler);
router.post('/:id/mark-paid', authenticate, validate(markEMIPaidValidation), markEMIPaidHandler);
router.get('/missed', authenticate, detectMissedEMIsHandler);
router.get('/missed/list', authenticate, getMissedEMIsHandler);
router.post('/loans/:id/early-closure', authenticate, validate(earlyClosureValidation), handleEarlyClosureHandler);
router.get('/upcoming', authenticate, getUpcomingEMIsHandler);

export default router;

