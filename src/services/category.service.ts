import { Category, ICategory } from '../models/Category.model';
import { Transaction } from '../models/Transaction.model';

export interface CreateCategoryData {
  userId: string;
  name: string;
  icon?: string;
  color?: string;
  keywords?: string[];
}

export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
  keywords?: string[];
}

// Default system categories with keywords for auto-application
export const DEFAULT_CATEGORIES = [
  {
    name: 'Food & Dining',
    icon: '🍽️',
    color: '#FF6B6B',
    keywords: ['food', 'restaurant', 'dining', 'cafe', 'meal', 'grocery', 'supermarket', 'zomato', 'swiggy', 'uber eats'],
  },
  {
    name: 'Transport',
    icon: '🚗',
    color: '#4ECDC4',
    keywords: ['uber', 'ola', 'taxi', 'fuel', 'petrol', 'diesel', 'metro', 'bus', 'train', 'flight', 'transport'],
  },
  {
    name: 'Entertainment',
    icon: '🎬',
    color: '#95E1D3',
    keywords: ['movie', 'cinema', 'netflix', 'spotify', 'entertainment', 'game', 'theater'],
  },
  {
    name: 'Bills & Utilities',
    icon: '💡',
    color: '#F38181',
    keywords: ['electricity', 'water', 'gas', 'internet', 'phone', 'bill', 'utility', 'broadband'],
  },
  {
    name: 'Shopping',
    icon: '🛍️',
    color: '#AA96DA',
    keywords: ['amazon', 'flipkart', 'shopping', 'purchase', 'buy', 'store'],
  },
  {
    name: 'Healthcare',
    icon: '🏥',
    color: '#FCBAD3',
    keywords: ['hospital', 'doctor', 'medicine', 'pharmacy', 'medical', 'health', 'clinic'],
  },
  {
    name: 'Education',
    icon: '📚',
    color: '#A8E6CF',
    keywords: ['school', 'college', 'tuition', 'course', 'education', 'book', 'study'],
  },
  {
    name: 'Salary & Income',
    icon: '💰',
    color: '#FFD93D',
    keywords: ['salary', 'income', 'wage', 'pay', 'credit'],
  },
  {
    name: 'Investment',
    icon: '📈',
    color: '#6BCB77',
    keywords: ['investment', 'mutual fund', 'stock', 'sip', 'fd', 'rd'],
  },
  {
    name: 'Transfer',
    icon: '🔄',
    color: '#4D96FF',
    keywords: ['transfer', 'upi', 'neft', 'imps', 'rtgs'],
  },
  {
    name: 'Other',
    icon: '📦',
    color: '#9B9B9B',
    keywords: [],
  },
];

/**
 * Seed default categories for a user
 */
export const seedDefaultCategories = async (userId: string): Promise<ICategory[]> => {
  const categories: ICategory[] = [];

  for (const defaultCat of DEFAULT_CATEGORIES) {
    const category = new Category({
      userId,
      name: defaultCat.name,
      type: 'system',
      icon: defaultCat.icon,
      color: defaultCat.color,
      keywords: defaultCat.keywords,
      isArchived: false,
    });
    await category.save();
    categories.push(category);
  }

  return categories;
};

/**
 * Create a custom category
 */
export const createCategory = async (data: CreateCategoryData): Promise<ICategory> => {
  // Check if category with same name exists for user
  const existing = await Category.findOne({
    userId: data.userId,
    name: data.name.trim(),
    isArchived: false,
  });

  if (existing) {
    throw new Error('Category with this name already exists');
  }

  const category = new Category({
    ...data,
    name: data.name.trim(),
    type: 'custom',
    isArchived: false,
  });

  return await category.save();
};

/**
 * Get all categories for a user
 */
export const getCategories = async (
  userId: string,
  includeArchived: boolean = false
): Promise<ICategory[]> => {
  const query: any = { userId };
  if (!includeArchived) {
    query.isArchived = false;
  }

  return await Category.find(query).sort({ type: 1, name: 1 });
};

/**
 * Get category by ID
 */
export const getCategoryById = async (
  categoryId: string,
  userId: string
): Promise<ICategory | null> => {
  return await Category.findOne({
    _id: categoryId,
    userId,
  });
};

/**
 * Update category
 */
export const updateCategory = async (
  categoryId: string,
  userId: string,
  data: UpdateCategoryData
): Promise<ICategory | null> => {
  const category = await Category.findOne({
    _id: categoryId,
    userId,
  });

  if (!category) {
    return null;
  }

  // System categories can only update icon, color, and keywords
  if (category.type === 'system') {
    if (data.name && data.name !== category.name) {
      throw new Error('Cannot rename system categories');
    }
  } else {
    // For custom categories, check name uniqueness if name is being changed
    if (data.name && data.name.trim() !== category.name) {
      const existing = await Category.findOne({
        userId,
        name: data.name.trim(),
        isArchived: false,
        _id: { $ne: categoryId },
      });

      if (existing) {
        throw new Error('Category with this name already exists');
      }
    }
  }

  Object.assign(category, data);
  if (data.name) {
    category.name = data.name.trim();
  }

  return await category.save();
};

/**
 * Archive category (soft delete)
 */
export const archiveCategory = async (
  categoryId: string,
  userId: string
): Promise<boolean> => {
  const category = await Category.findOne({
    _id: categoryId,
    userId,
  });

  if (!category) {
    return false;
  }

  if (category.type === 'system') {
    throw new Error('Cannot archive system categories');
  }

  category.isArchived = true;
  await category.save();

  return true;
};

/**
 * Merge two categories (reassign all transactions from source to target)
 */
export const mergeCategories = async (
  sourceCategoryId: string,
  targetCategoryId: string,
  userId: string
): Promise<{ merged: boolean; transactionCount: number }> => {
  const sourceCategory = await Category.findOne({
    _id: sourceCategoryId,
    userId,
  });

  const targetCategory = await Category.findOne({
    _id: targetCategoryId,
    userId,
  });

  if (!sourceCategory || !targetCategory) {
    throw new Error('One or both categories not found');
  }

  if (sourceCategory._id.toString() === targetCategory._id.toString()) {
    throw new Error('Cannot merge category with itself');
  }

  // Update all transactions with source category to target category
  const result = await Transaction.updateMany(
    {
      userId,
      category: sourceCategoryId,
      deletedAt: null,
    },
    {
      $set: { category: targetCategoryId },
    }
  );

  // Archive the source category
  sourceCategory.isArchived = true;
  await sourceCategory.save();

  return {
    merged: true,
    transactionCount: result.modifiedCount,
  };
};

/**
 * Auto-apply category based on description keywords
 */
export const autoApplyCategory = async (
  userId: string,
  description: string
): Promise<{ categoryId: string | null; confidence: number }> => {
  const categories = await Category.find({
    userId,
    isArchived: false,
  });

  const normalizedDescription = description.toLowerCase().trim();
  let bestMatch: { categoryId: string; score: number } | null = null;

  for (const category of categories) {
    if (!category.keywords || category.keywords.length === 0) {
      continue;
    }

    let score = 0;
    for (const keyword of category.keywords) {
      if (normalizedDescription.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        categoryId: category._id.toString(),
        score,
      };
    }
  }

  if (!bestMatch) {
    return { categoryId: null, confidence: 0 };
  }

  // Calculate confidence (0-1) based on score
  const maxPossibleScore = Math.max(...categories.map((c) => c.keywords?.length || 0));
  const confidence = Math.min(bestMatch.score / Math.max(maxPossibleScore, 1), 1);

  return {
    categoryId: bestMatch.categoryId,
    confidence,
  };
};

