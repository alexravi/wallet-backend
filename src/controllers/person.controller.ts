import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createPerson,
  getPeople,
  getPersonById,
  updatePerson,
  deletePerson,
  getPersonSpendingSummary,
  checkPersonLimits,
  CreatePersonData,
  UpdatePersonData,
} from '../services/person.service';

/**
 * Get all people
 */
export const getPeopleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const includeInactive = req.query.includeInactive === 'true';

    const people = await getPeople(userId, includeInactive);

    res.json({
      message: 'People retrieved successfully',
      data: people,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve people',
    });
  }
};

/**
 * Get person by ID
 */
export const getPersonByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const personId = req.params.id;

    const person = await getPersonById(personId, userId);

    if (!person) {
      return res.status(404).json({
        error: 'Person not found',
      });
    }

    res.json({
      message: 'Person retrieved successfully',
      data: person,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve person',
    });
  }
};

/**
 * Create person
 */
export const createPersonHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreatePersonData = {
      userId,
      name: req.body.name,
      type: req.body.type || 'other',
      notes: req.body.notes,
      overallLimit: req.body.overallLimit,
      limitPeriod: req.body.limitPeriod || 'monthly',
      categoryLimits: req.body.categoryLimits,
    };

    const person = await createPerson(data);

    res.status(201).json({
      message: 'Person created successfully',
      data: person,
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to create person',
    });
  }
};

/**
 * Update person
 */
export const updatePersonHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const personId = req.params.id;
    const data: UpdatePersonData = {
      name: req.body.name,
      type: req.body.type,
      notes: req.body.notes,
      overallLimit: req.body.overallLimit,
      limitPeriod: req.body.limitPeriod,
      categoryLimits: req.body.categoryLimits,
    };

    // Remove undefined fields
    Object.keys(data).forEach((key) => {
      if (data[key as keyof UpdatePersonData] === undefined) {
        delete data[key as keyof UpdatePersonData];
      }
    });

    const person = await updatePerson(personId, userId, data);

    if (!person) {
      return res.status(404).json({
        error: 'Person not found',
      });
    }

    res.json({
      message: 'Person updated successfully',
      data: person,
    });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
      });
    }
    res.status(400).json({
      error: error.message || 'Failed to update person',
    });
  }
};

/**
 * Delete person
 */
export const deletePersonHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const personId = req.params.id;

    const success = await deletePerson(personId, userId);

    if (!success) {
      return res.status(404).json({
        error: 'Person not found',
      });
    }

    res.json({
      message: 'Person deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to delete person',
    });
  }
};

/**
 * Get spending summary for a person
 */
export const getPersonSpendingSummaryHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const personId = req.params.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await getPersonSpendingSummary(personId, userId, startDate, endDate);

    res.json({
      message: 'Spending summary retrieved successfully',
      data: summary,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      });
    }
    res.status(500).json({
      error: error.message || 'Failed to retrieve spending summary',
    });
  }
};

/**
 * Check limit status for a person
 */
export const checkPersonLimitsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const personId = req.params.id;
    const transactionAmount = parseFloat(req.query.amount as string) || 0;
    const categoryId = req.query.categoryId as string | undefined;

    const limitStatus = await checkPersonLimits(personId, userId, transactionAmount, categoryId);

    res.json({
      message: 'Limit status retrieved successfully',
      data: limitStatus,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      });
    }
    res.status(500).json({
      error: error.message || 'Failed to check limits',
    });
  }
};

