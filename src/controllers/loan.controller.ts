import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createLoan,
  recordPayment,
  closeLoan,
  getLoansByUser,
  getLoanById,
  updateLoan,
  CreateLoanData,
  RecordPaymentData,
  LoanFilters,
} from '../services/loan.service';
import { generateEMISchedule } from '../services/emi.service';

/**
 * Create a new loan
 */
export const createLoanHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: CreateLoanData = {
      userId,
      loanType: req.body.loanType,
      loanCategory: req.body.loanCategory,
      principal: req.body.principal,
      interestType: req.body.interestType || 'flat',
      interestRate: req.body.interestRate,
      startDate: new Date(req.body.startDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      linkedPersonId: req.body.linkedPersonId,
      linkedAccountId: req.body.linkedAccountId,
      linkedWalletId: req.body.linkedWalletId,
      notes: req.body.notes,
      currency: req.body.currency || 'INR',
    };

    const loan = await createLoan(data);

    // Auto-generate EMI schedule for bank loans if numberOfEMIs is provided
    if (loan.loanCategory === 'bank' && req.body.numberOfEMIs) {
      try {
        await generateEMISchedule({
          loanId: loan._id.toString(),
          userId,
          numberOfEMIs: req.body.numberOfEMIs,
          emiAmount: req.body.emiAmount,
        });
      } catch (error: any) {
        // Log error but don't fail loan creation
        console.error('Failed to generate EMI schedule:', error.message);
      }
    }

    res.status(201).json({
      message: 'Loan created successfully',
      data: loan,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to create loan',
    });
  }
};

/**
 * Get all loans for user
 */
export const getLoansHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const filters: LoanFilters = {
      userId,
      loanType: req.query.loanType as any,
      loanCategory: req.query.loanCategory as any,
      status: req.query.status as any,
      linkedPersonId: req.query.linkedPersonId as string,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof LoanFilters] === undefined) {
        delete filters[key as keyof LoanFilters];
      }
    });

    const loans = await getLoansByUser(filters);

    res.json({
      message: 'Loans retrieved successfully',
      data: loans,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve loans',
    });
  }
};

/**
 * Get loan by ID
 */
export const getLoanByIdHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;

    const loan = await getLoanById(loanId, userId);

    if (!loan) {
      return res.status(404).json({
        error: 'Loan not found',
      });
    }

    res.json({
      message: 'Loan retrieved successfully',
      data: loan,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to retrieve loan',
    });
  }
};

/**
 * Record loan payment
 */
export const recordPaymentHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;

    const data: RecordPaymentData = {
      loanId,
      userId,
      paymentType: req.body.paymentType,
      amount: req.body.amount,
      principalAmount: req.body.principalAmount,
      interestAmount: req.body.interestAmount,
      paymentDate: new Date(req.body.paymentDate || Date.now()),
      emiScheduleId: req.body.emiScheduleId,
      notes: req.body.notes,
    };

    const result = await recordPayment(data);

    res.status(201).json({
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to record payment',
    });
  }
};

/**
 * Close or write-off loan
 */
export const closeLoanHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;
    const writeOff = req.body.writeOff === true;

    const loan = await closeLoan(loanId, userId, writeOff);

    res.json({
      message: writeOff ? 'Loan written off successfully' : 'Loan closed successfully',
      data: loan,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to close loan',
    });
  }
};

/**
 * Update loan
 */
export const updateLoanHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loanId = req.params.id;

    const updates: {
      notes?: string;
      endDate?: Date;
    } = {};

    if (req.body.notes !== undefined) {
      updates.notes = req.body.notes;
    }

    if (req.body.endDate !== undefined) {
      updates.endDate = new Date(req.body.endDate);
    }

    const loan = await updateLoan(loanId, userId, updates);

    if (!loan) {
      return res.status(404).json({
        error: 'Loan not found',
      });
    }

    res.json({
      message: 'Loan updated successfully',
      data: loan,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to update loan',
    });
  }
};

