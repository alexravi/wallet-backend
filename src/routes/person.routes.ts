import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  getPeopleHandler,
  getPersonByIdHandler,
  createPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
  getPersonSpendingSummaryHandler,
  checkPersonLimitsHandler,
} from '../controllers/person.controller';

const router = Router();

// Validation rules
const createPersonValidation = [
  body('name').notEmpty().trim().withMessage('Person name is required'),
  body('type').optional().isIn(['child', 'friend', 'employee', 'family', 'other']).withMessage('Invalid person type'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('overallLimit').optional().isFloat({ min: 0 }).withMessage('Overall limit must be a positive number'),
  body('limitPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid limit period'),
  body('categoryLimits').optional().isArray().withMessage('Category limits must be an array'),
];

const updatePersonValidation = [
  body('name').optional().notEmpty().trim().withMessage('Person name cannot be empty'),
  body('type').optional().isIn(['child', 'friend', 'employee', 'family', 'other']).withMessage('Invalid person type'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('overallLimit').optional().isFloat({ min: 0 }).withMessage('Overall limit must be a positive number'),
  body('limitPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid limit period'),
  body('categoryLimits').optional().isArray().withMessage('Category limits must be an array'),
];

// Routes
router.get('/', authenticate, getPeopleHandler);
router.get('/:id', authenticate, getPersonByIdHandler);
router.post('/', authenticate, validate(createPersonValidation), createPersonHandler);
router.put('/:id', authenticate, validate(updatePersonValidation), updatePersonHandler);
router.delete('/:id', authenticate, deletePersonHandler);
router.get('/:id/spending', authenticate, getPersonSpendingSummaryHandler);
router.get('/:id/spending/limits', authenticate, checkPersonLimitsHandler);

export default router;

