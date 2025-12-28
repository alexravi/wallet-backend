import { Loan, ILoan } from '../models/Loan.model';
import { LoanPayment, ILoanPayment } from '../models/LoanPayment.model';
import { getBankAccountById, updateBankAccountBalance } from './account.service';
import { getCashWalletById, updateCashWalletBalance } from './account.service';
import { createTransaction, CreateTransactionData } from './transaction.service';
import { markEMIPaid } from './emi.service';
import mongoose from 'mongoose';

export interface CreateLoanData {
  userId: string;
  loanType: 'borrowed' | 'given' | 'hand';
  loanCategory: 'bank' | 'cash';
  principal: number;
  interestType: 'flat' | 'simple' | 'compound';
  interestRate: number;
  startDate: Date;
  endDate?: Date;
  linkedPersonId?: string;
  linkedAccountId?: string;
  linkedWalletId?: string;
  notes?: string;
  currency?: string;
}

export interface RecordPaymentData {
  loanId: string;
  userId: string;
  paymentType: 'emi' | 'partial' | 'prepayment' | 'irregular';
  amount: number;
  principalAmount: number;
  interestAmount: number;
  paymentDate: Date;
  emiScheduleId?: string;
  notes?: string;
}

export interface LoanFilters {
  userId: string;
  loanType?: 'borrowed' | 'given' | 'hand';
  loanCategory?: 'bank' | 'cash';
  status?: 'active' | 'closed' | 'written-off';
  linkedPersonId?: string;
}

/**
 * Create a new loan
 */
export const createLoan = async (data: CreateLoanData): Promise<ILoan> => {
  // Validate linked account/wallet exists
  if (data.loanCategory === 'bank' && data.linkedAccountId) {
    const account = await getBankAccountById(data.linkedAccountId, data.userId);
    if (!account) {
      throw new Error('Bank account not found');
    }
  } else if (data.loanCategory === 'cash' && data.linkedWalletId) {
    const wallet = await getCashWalletById(data.linkedWalletId, data.userId);
    if (!wallet) {
      throw new Error('Cash wallet not found');
    }
  }

  const loan = new Loan({
    ...data,
    outstandingAmount: data.principal,
    totalPaid: 0,
    status: 'active',
    currency: data.currency || 'INR',
  });

  const savedLoan = await loan.save();

  // Auto-generate EMI schedule for bank loans (will be handled by EMI service)
  // This is called from the controller after loan creation

  return savedLoan;
};

/**
 * Calculate outstanding amount for a loan
 */
export const calculateOutstanding = async (loanId: string): Promise<number> => {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  // Get all completed payments
  const payments = await LoanPayment.find({
    loanId,
    status: 'completed',
  });

  const totalPaid = payments.reduce((sum, payment) => sum + payment.principalAmount, 0);
  const totalInterestPaid = payments.reduce((sum, payment) => sum + payment.interestAmount, 0);

  // Calculate total interest accrued (flat rate)
  // For flat rate: Interest = (Principal × Rate × Time) / 100
  // Time is calculated from start date to current date or end date
  const endDate = loan.endDate || new Date();
  const timeInMonths = Math.max(
    0,
    (endDate.getTime() - loan.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  let totalInterestAccrued = 0;
  if (loan.interestType === 'flat') {
    // Flat rate: fixed interest per period
    totalInterestAccrued = (loan.principal * loan.interestRate * timeInMonths) / 100;
  } else if (loan.interestType === 'simple') {
    // Simple interest: Principal × Rate × Time
    totalInterestAccrued = (loan.principal * loan.interestRate * timeInMonths) / 100;
  } else if (loan.interestType === 'compound') {
    // Compound interest: Principal × (1 + Rate/100)^Time - Principal
    const rateDecimal = loan.interestRate / 100;
    totalInterestAccrued = loan.principal * (Math.pow(1 + rateDecimal, timeInMonths) - 1);
  }

  // Outstanding = Principal + Total Interest Accrued - Total Payments Made
  const outstanding = loan.principal + totalInterestAccrued - totalPaid;

  // Update loan with calculated values
  loan.outstandingAmount = Math.max(0, outstanding);
  loan.totalPaid = totalPaid;
  await loan.save();

  return loan.outstandingAmount;
};

/**
 * Record a loan payment
 */
export const recordPayment = async (data: RecordPaymentData): Promise<{
  payment: ILoanPayment;
  loan: ILoan;
  transaction?: any;
}> => {
  const loan = await Loan.findById(data.loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.userId.toString() !== data.userId) {
    throw new Error('Unauthorized');
  }

  if (loan.status !== 'active') {
    throw new Error('Cannot record payment for closed or written-off loan');
  }

  // Validate payment amount
  if (data.amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  if (data.principalAmount + data.interestAmount !== data.amount) {
    throw new Error('Principal and interest amounts must sum to total amount');
  }

  // Create payment record
  const payment = new LoanPayment({
    ...data,
    status: 'completed',
  });

  const savedPayment = await payment.save();

  // Update loan outstanding
  loan.totalPaid += data.principalAmount;
  await calculateOutstanding(data.loanId);

  // Mark EMI as paid if applicable
  if (data.emiScheduleId) {
    await markEMIPaid(data.emiScheduleId, savedPayment._id.toString(), data.paymentDate);
  }

  // Auto-create transaction in linked account/wallet
  let transaction = null;
  if (loan.loanCategory === 'bank' && loan.linkedAccountId) {
    const account = await getBankAccountById(loan.linkedAccountId.toString(), data.userId);
    if (account) {
      const transactionData: CreateTransactionData = {
        userId: data.userId,
        accountId: loan.linkedAccountId.toString(),
        accountType: 'bank',
        type: loan.loanType === 'borrowed' ? 'expense' : 'income',
        amount: data.amount,
        currency: loan.currency,
        description: `Loan payment - ${loan.loanType} (${payment.paymentType})`,
        date: data.paymentDate,
        notes: data.notes,
      };

      transaction = await createTransaction(transactionData);
      payment.transactionId = transaction._id;
      await payment.save();

      // Update account balance
      if (loan.loanType === 'borrowed') {
        await updateBankAccountBalance(loan.linkedAccountId.toString(), -data.amount);
      } else {
        await updateBankAccountBalance(loan.linkedAccountId.toString(), data.amount);
      }
    }
  } else if (loan.loanCategory === 'cash' && loan.linkedWalletId) {
    const wallet = await getCashWalletById(loan.linkedWalletId.toString(), data.userId);
    if (wallet) {
      const transactionData: CreateTransactionData = {
        userId: data.userId,
        accountId: loan.linkedWalletId.toString(),
        accountType: 'cash',
        type: loan.loanType === 'borrowed' ? 'expense' : 'income',
        amount: data.amount,
        currency: loan.currency,
        description: `Loan payment - ${loan.loanType} (${payment.paymentType})`,
        date: data.paymentDate,
        notes: data.notes,
      };

      transaction = await createTransaction(transactionData);
      payment.transactionId = transaction._id;
      await payment.save();

      // Update wallet balance
      if (loan.loanType === 'borrowed') {
        await updateCashWalletBalance(loan.linkedWalletId.toString(), -data.amount);
      } else {
        await updateCashWalletBalance(loan.linkedWalletId.toString(), data.amount);
      }
    }
  }

  const updatedLoan = await Loan.findById(data.loanId);
  if (!updatedLoan) {
    throw new Error('Loan not found after payment');
  }

  return {
    payment: savedPayment,
    loan: updatedLoan,
    transaction,
  };
};

/**
 * Close or write-off a loan
 */
export const closeLoan = async (
  loanId: string,
  userId: string,
  writeOff: boolean = false
): Promise<ILoan> => {
  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw new Error('Loan not found');
  }

  if (loan.userId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  if (loan.status !== 'active') {
    throw new Error('Loan is already closed or written-off');
  }

  // Calculate final outstanding
  await calculateOutstanding(loanId);

  loan.status = writeOff ? 'written-off' : 'closed';
  await loan.save();

  return loan;
};

/**
 * Get all loans for a user with filters
 */
export const getLoansByUser = async (filters: LoanFilters): Promise<ILoan[]> => {
  const query: any = {
    userId: filters.userId,
  };

  if (filters.loanType) {
    query.loanType = filters.loanType;
  }

  if (filters.loanCategory) {
    query.loanCategory = filters.loanCategory;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.linkedPersonId) {
    query.linkedPersonId = filters.linkedPersonId;
  }

  return await Loan.find(query)
    .populate('linkedPersonId')
    .populate('linkedAccountId')
    .populate('linkedWalletId')
    .sort({ startDate: -1 });
};

/**
 * Get loan by ID
 */
export const getLoanById = async (loanId: string, userId: string): Promise<ILoan | null> => {
  const loan = await Loan.findOne({
    _id: loanId,
    userId,
  })
    .populate('linkedPersonId')
    .populate('linkedAccountId')
    .populate('linkedWalletId');

  if (loan) {
    // Calculate current outstanding
    await calculateOutstanding(loanId);
  }

  return loan;
};

/**
 * Update loan (limited fields)
 */
export const updateLoan = async (
  loanId: string,
  userId: string,
  updates: {
    notes?: string;
    endDate?: Date;
  }
): Promise<ILoan | null> => {
  const loan = await Loan.findOne({
    _id: loanId,
    userId,
  });

  if (!loan) {
    return null;
  }

  if (loan.status !== 'active') {
    throw new Error('Cannot update closed or written-off loan');
  }

  if (updates.notes !== undefined) {
    loan.notes = updates.notes;
  }

  if (updates.endDate !== undefined) {
    loan.endDate = updates.endDate;
  }

  await loan.save();
  await calculateOutstanding(loanId);

  return loan;
};

