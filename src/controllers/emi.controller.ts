import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  generateEMISchedule,
  getEMISchedule,
  markEMIPaid,
  detectMissedEMIs,
  getMissedEMIs,
  handleEarlyClosure,
  regenerateEMISchedule,
  getUpcomingEMIs,
  GenerateEMIScheduleData,
} from '../services/emi.service';

/**
 * Generate or regenerate EMI schedule
 */
export const generateEMIScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;

    const data: GenerateEMIScheduleData = {
      loanId,
      userId,
      numberOfEMIs: req.body.numberOfEMIs,
      emiAmount: req.body.emiAmount,
    };

    const schedule = await generateEMISchedule(data);

    res.status(201).json({
      message: 'EMI schedule generated successfully',
      data: schedule,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to generate EMI schedule',
    });
  }
};

/**
 * Regenerate EMI schedule
 */
export const regenerateEMIScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;

    const data: GenerateEMIScheduleData = {
      loanId,
      userId,
      numberOfEMIs: req.body.numberOfEMIs,
      emiAmount: req.body.emiAmount,
    };

    const schedule = await regenerateEMISchedule(data);

    res.json({
      message: 'EMI schedule regenerated successfully',
      data: schedule,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to regenerate EMI schedule',
    });
  }
};

/**
 * Get EMI schedule for a loan
 */
export const getEMIScheduleHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;

    const schedule = await getEMISchedule(loanId, userId);

    res.json({
      message: 'EMI schedule retrieved successfully',
      data: schedule,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve EMI schedule',
    });
  }
};

/**
 * Mark EMI as paid
 */
export const markEMIPaidHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const emiScheduleId = req.params.id;
    const paymentId = req.body.paymentId;
    const paidDate = req.body.paidDate ? new Date(req.body.paidDate) : new Date();

    const emi = await markEMIPaid(emiScheduleId, paymentId, paidDate);

    res.json({
      message: 'EMI marked as paid successfully',
      data: emi,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to mark EMI as paid',
    });
  }
};

/**
 * Detect and get missed EMIs
 */
export const detectMissedEMIsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // First detect missed EMIs
    await detectMissedEMIs(userId);

    // Then get all missed EMIs
    const loanId = req.query.loanId as string;
    const missedEMIs = await getMissedEMIs(userId, loanId);

    res.json({
      message: 'Missed EMIs retrieved successfully',
      data: missedEMIs,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve missed EMIs',
    });
  }
};

/**
 * Get missed EMIs
 */
export const getMissedEMIsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.query.loanId as string;

    const missedEMIs = await getMissedEMIs(userId, loanId);

    res.json({
      message: 'Missed EMIs retrieved successfully',
      data: missedEMIs,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve missed EMIs',
    });
  }
};

/**
 * Handle early closure
 */
export const handleEarlyClosureHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;
    const closureDate = req.body.closureDate ? new Date(req.body.closureDate) : new Date();

    const result = await handleEarlyClosure(loanId, userId, closureDate);

    res.json({
      message: 'Early closure handled successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to handle early closure',
    });
  }
};

/**
 * Get upcoming EMIs
 */
export const getUpcomingEMIsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const upcomingEMIs = await getUpcomingEMIs(userId, days);

    res.json({
      message: 'Upcoming EMIs retrieved successfully',
      data: upcomingEMIs,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve upcoming EMIs',
    });
  }
};

