import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createSavingsGoal,
  addContribution,
  calculateProgress,
  checkDeviation,
  pauseGoal,
  resumeGoal,
  getSavingsGoals,
  getSavingsGoalById,
  getContributions,
  cancelGoal,
  CreateSavingsGoalData,
  AddContributionData,
  SavingsGoalFilters,
} from '../services/savings.service';

/**
 * Create a new savings goal
 */
export const createSavingsGoalHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateSavingsGoalData = {
      userId,
      goalName: req.body.goalName,
      targetAmount: req.body.targetAmount,
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : undefined,
      priority: req.body.priority || 'medium',
      linkedAccountId: req.body.linkedAccountId,
      linkedWalletId: req.body.linkedWalletId,
      accountType: req.body.accountType,
      currency: req.body.currency || 'INR',
      autoContribution: req.body.autoContribution,
      notes: req.body.notes,
    };

    const goal = await createSavingsGoal(data);

    res.status(201).json({
      message: 'Savings goal created successfully',
      data: goal,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create savings goal',
    });
  }
};

/**
 * Get all savings goals
 */
export const getSavingsGoalsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const filters: SavingsGoalFilters = {
      userId,
      status: req.query.status as any,
      priority: req.query.priority as any,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof SavingsGoalFilters] === undefined) {
        delete filters[key as keyof SavingsGoalFilters];
      }
    });

    const goals = await getSavingsGoals(filters);

    // Calculate progress for each goal
    const goalsWithProgress = goals.map((goal) => ({
      ...goal.toObject(),
      progress: calculateProgress(goal),
    }));

    res.json({
      message: 'Savings goals retrieved successfully',
      data: goalsWithProgress,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve savings goals',
    });
  }
};

/**
 * Get savings goal by ID
 */
export const getSavingsGoalByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const goal = await getSavingsGoalById(goalId, userId);

    if (!goal) {
      return res.status(404).json({
        error: 'Savings goal not found',
      });
    }

    const progress = calculateProgress(goal);

    res.json({
      message: 'Savings goal retrieved successfully',
      data: {
        ...goal.toObject(),
        progress,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve savings goal',
    });
  }
};

/**
 * Add contribution to savings goal
 */
export const addContributionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const data: AddContributionData = {
      goalId,
      userId,
      amount: req.body.amount,
      contributionDate: new Date(req.body.contributionDate || Date.now()),
      sourceAccountId: req.body.sourceAccountId,
      sourceAccountType: req.body.sourceAccountType,
      notes: req.body.notes,
      createTransaction: req.body.createTransaction !== false,
    };

    const result = await addContribution(data);

    res.status(201).json({
      message: 'Contribution added successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to add contribution',
    });
  }
};

/**
 * Get contributions for a goal
 */
export const getContributionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const contributions = await getContributions(goalId, userId);

    res.json({
      message: 'Contributions retrieved successfully',
      data: contributions,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve contributions',
    });
  }
};

/**
 * Pause savings goal
 */
export const pauseGoalHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const goal = await pauseGoal(goalId, userId);

    res.json({
      message: 'Savings goal paused successfully',
      data: goal,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to pause savings goal',
    });
  }
};

/**
 * Resume savings goal
 */
export const resumeGoalHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const goal = await resumeGoal(goalId, userId);

    res.json({
      message: 'Savings goal resumed successfully',
      data: goal,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to resume savings goal',
    });
  }
};

/**
 * Get deviation alerts for a goal
 */
export const getDeviationAlertsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const deviation = await checkDeviation(goalId, userId);

    res.json({
      message: 'Deviation alerts retrieved successfully',
      data: deviation,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve deviation alerts',
    });
  }
};

/**
 * Cancel savings goal
 */
export const cancelGoalHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goalId = req.params.id;

    const goal = await cancelGoal(goalId, userId);

    res.json({
      message: 'Savings goal cancelled successfully',
      data: goal,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to cancel savings goal',
    });
  }
};

