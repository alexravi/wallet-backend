import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  archiveCategory,
  mergeCategories,
  CreateCategoryData,
  UpdateCategoryData,
} from '../services/category.service';

/**
 * Get all categories
 */
export const getCategoriesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const includeArchived = req.query.includeArchived === 'true';

    const categories = await getCategories(userId, includeArchived);

    res.json({
      message: 'Categories retrieved successfully',
      data: categories,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve categories',
    });
  }
};

/**
 * Get category by ID
 */
export const getCategoryByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const categoryId = req.params.id;

    const category = await getCategoryById(categoryId, userId);

    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
      });
    }

    res.json({
      message: 'Category retrieved successfully',
      data: category,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve category',
    });
  }
};

/**
 * Create category
 */
export const createCategoryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateCategoryData = {
      userId,
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      keywords: req.body.keywords,
    };

    const category = await createCategory(data);

    res.status(201).json({
      message: 'Category created successfully',
      data: category,
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to create category',
    });
  }
};

/**
 * Update category
 */
export const updateCategoryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const categoryId = req.params.id;
    const data: UpdateCategoryData = {
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
      keywords: req.body.keywords,
    };

    // Remove undefined fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdateCategoryData] === undefined) {
        delete data[key as keyof UpdateCategoryData];
      }
    });

    const category = await updateCategory(categoryId, userId, data);

    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
      });
    }

    res.json({
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error: any) {
    if (error.message.includes('already exists') || error.message.includes('Cannot rename')) {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to update category',
    });
  }
};

/**
 * Archive category
 */
export const archiveCategoryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const categoryId = req.params.id;

    const success = await archiveCategory(categoryId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Category not found',
      });
    }

    res.json({
      message: 'Category archived successfully',
    });
  } catch (error: any) {
    if (error.message.includes('Cannot archive')) {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to archive category',
    });
  }
};

/**
 * Merge categories
 */
export const mergeCategoriesHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const sourceCategoryId = req.params.id;
    const { targetCategoryId } = req.body;

    if (!targetCategoryId) {
      return res.status(400).json({
        error: 'Target category ID is required',
      });
    }

    const result = await mergeCategories(sourceCategoryId, targetCategoryId, userId);

    res.json({
      message: 'Categories merged successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('Cannot merge')) {
      return res.status(404).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to merge categories',
    });
  }
};

