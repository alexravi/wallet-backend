import { EMISchedule, IEMISchedule } from '../models/EMISchedule.model';
import { Loan, ILoan } from '../models/Loan.model';
import { LoanPayment } from '../models/LoanPayment.model';
import mongoose from 'mongoose';

export interface GenerateEMIScheduleData {
  loanId: string;
  userId: string;
  numberOfEMIs: number;
  emiAmount?: number; // Optional: if provided, use this instead of calculating
}

/**
 * Generate EMI schedule for a loan
 */
export const generateEMISchedule = async (
  data: GenerateEMIScheduleData
): Promise<IEMISchedule[]> => {
  const loan = await Loan.findById(data.loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.userId.toString() !== data.userId) {
    throw new Error('Unauthorized');
  }

  // For cash loans, only allow manual creation (this should be called explicitly)
  // For bank loans, auto-generate
  if (loan.loanCategory === 'cash') {
    // Check if schedule already exists
    const existing = await EMISchedule.findOne({ loanId: data.loanId });
    if (existing) {
      throw new Error('EMI schedule already exists for this loan. Use regenerate to update.');
    }
  }

  // Delete existing schedule if regenerating
  await EMISchedule.deleteMany({ loanId: data.loanId });

  const schedule: IEMISchedule[] = [];
  const principalPerEMI = loan.principal / data.numberOfEMIs;

  // Calculate interest per EMI (flat rate)
  // For flat rate: Interest per period = (Principal × Rate) / (100 × Number of periods)
  // But since we're using monthly EMIs, we calculate monthly interest
  const monthlyInterestRate = loan.interestRate / 12; // Annual rate to monthly
  const interestPerEMI = (loan.principal * monthlyInterestRate) / 100;

  // Calculate total EMI amount
  const totalEMIAmount = data.emiAmount || principalPerEMI + interestPerEMI;

  // Generate EMI schedule
  for (let i = 1; i <= data.numberOfEMIs; i++) {
    const dueDate = new Date(loan.startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    // Adjust principal for last EMI to account for rounding
    const adjustedPrincipal =
      i === data.numberOfEMIs
        ? loan.principal - principalPerEMI * (data.numberOfEMIs - 1)
        : principalPerEMI;

    const emi = new EMISchedule({
      loanId: data.loanId,
      userId: data.userId,
      emiNumber: i,
      dueDate,
      principalAmount: adjustedPrincipal,
      interestAmount: interestPerEMI,
      totalAmount: totalEMIAmount,
      status: 'pending',
    });

    schedule.push(emi);
  }

  // Save all EMIs
  await EMISchedule.insertMany(schedule);

  return await EMISchedule.find({ loanId: data.loanId }).sort({ emiNumber: 1 });
};

/**
 * Get EMI schedule for a loan
 */
export const getEMISchedule = async (
  loanId: string,
  userId: string
): Promise<IEMISchedule[]> => {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  return await EMISchedule.find({ loanId })
    .populate('paymentId')
    .sort({ emiNumber: 1 });
};

/**
 * Mark EMI as paid
 */
export const markEMIPaid = async (
  emiScheduleId: string,
  paymentId: string,
  paidDate: Date
): Promise<IEMISchedule> => {
  const emi = await EMISchedule.findById(emiScheduleId);
  if (!emi) {
    throw new Error('EMI schedule not found');
  }

  if (emi.status === 'paid') {
    throw new Error('EMI is already marked as paid');
  }

  emi.status = 'paid';
  emi.paymentId = new mongoose.Types.ObjectId(paymentId);
  emi.paidDate = paidDate;
  await emi.save();

  return emi;
};

/**
 * Detect missed EMIs
 */
export const detectMissedEMIs = async (userId: string): Promise<IEMISchedule[]> => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Find all pending EMIs that are past due date
  const missedEMIs = await EMISchedule.find({
    userId,
    status: 'pending',
    dueDate: { $lt: now },
  })
    .populate('loanId')
    .sort({ dueDate: 1 });

  // Update status to missed
  const emiIds = missedEMIs.map((emi) => emi._id);
  await EMISchedule.updateMany(
    { _id: { $in: emiIds } },
    { $set: { status: 'missed' } }
  );

  // Return updated EMIs
  return await EMISchedule.find({ _id: { $in: emiIds } })
    .populate('loanId')
    .sort({ dueDate: 1 });
};

/**
 * Get missed EMIs for a user
 */
export const getMissedEMIs = async (
  userId: string,
  loanId?: string
): Promise<IEMISchedule[]> => {
  const query: any = {
    userId,
    status: 'missed',
  };

  if (loanId) {
    query.loanId = loanId;
  }

  return await EMISchedule.find(query)
    .populate('loanId')
    .populate('paymentId')
    .sort({ dueDate: 1 });
};

/**
 * Handle early loan closure
 */
export const handleEarlyClosure = async (
  loanId: string,
  userId: string,
  closureDate: Date
): Promise<{
  skippedEMIs: IEMISchedule[];
  finalSettlement: number;
}> => {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  // Find all pending EMIs after closure date
  const pendingEMIs = await EMISchedule.find({
    loanId,
    status: 'pending',
    dueDate: { $gt: closureDate },
  });

  // Mark them as skipped
  await EMISchedule.updateMany(
    { _id: { $in: pendingEMIs.map((emi) => emi._id) } },
    {
      $set: {
        status: 'skipped',
        isEarlyClosure: true,
      },
    }
  );

  // Calculate final settlement (outstanding amount)
  // This will be calculated by the loan service
  const skippedEMIs = await EMISchedule.find({
    loanId,
    status: 'skipped',
    isEarlyClosure: true,
  }).sort({ emiNumber: 1 });

  return {
    skippedEMIs,
    finalSettlement: 0, // Will be calculated by loan service
  };
};

/**
 * Regenerate EMI schedule
 */
export const regenerateEMISchedule = async (
  data: GenerateEMIScheduleData
): Promise<IEMISchedule[]> => {
  const loan = await Loan.findById(data.loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.userId.toString() !== data.userId) {
    throw new Error('Unauthorized');
  }

  // Check if any EMIs are already paid
  const paidEMIs = await EMISchedule.find({
    loanId: data.loanId,
    status: 'paid',
  });

  if (paidEMIs.length > 0) {
    throw new Error('Cannot regenerate schedule with paid EMIs. Please close the loan first.');
  }

  // Delete existing schedule and regenerate
  return await generateEMISchedule(data);
};

/**
 * Get upcoming EMIs
 */
export const getUpcomingEMIs = async (
  userId: string,
  days: number = 30
): Promise<IEMISchedule[]> => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return await EMISchedule.find({
    userId,
    status: 'pending',
    dueDate: {
      $gte: now,
      $lte: futureDate,
    },
  })
    .populate('loanId')
    .sort({ dueDate: 1 });
};

