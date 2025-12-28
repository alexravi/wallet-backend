import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  archiveCategoryHandler,
  mergeCategoriesHandler,
} from '../controllers/category.controller';

const router = Router();

// Validation rules
const createCategoryValidation = [
  body('name').notEmpty().trim().withMessage('Category name is required'),
  body('icon').optional().isString().withMessage('Icon must be a string'),
  body('color').optional().isString().withMessage('Color must be a string'),
  body('keywords').optional().isArray().withMessage('Keywords must be an array'),
];

const updateCategoryValidation = [
  body('name').optional().notEmpty().trim().withMessage('Category name cannot be empty'),
  body('icon').optional().isString().withMessage('Icon must be a string'),
  body('color').optional().isString().withMessage('Color must be a string'),
  body('keywords').optional().isArray().withMessage('Keywords must be an array'),
];

const mergeCategoriesValidation = [
  body('targetCategoryId').notEmpty().withMessage('Target category ID is required'),
];

// Routes
router.get('/', authenticate, getCategoriesHandler);
router.get('/:id', authenticate, getCategoryByIdHandler);
router.post('/', authenticate, validate(createCategoryValidation), createCategoryHandler);
router.put('/:id', authenticate, validate(updateCategoryValidation), updateCategoryHandler);
router.delete('/:id', authenticate, archiveCategoryHandler);
router.post('/:id/merge', authenticate, validate(mergeCategoriesValidation), mergeCategoriesHandler);

export default router;

