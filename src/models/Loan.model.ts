import mongoose, { Document, Schema } from 'mongoose';

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  loanType: 'borrowed' | 'given' | 'hand';
  loanCategory: 'bank' | 'cash';
  principal: number;
  interestType: 'flat' | 'simple' | 'compound';
  interestRate: number;
  startDate: Date;
  endDate?: Date;
  linkedPersonId?: mongoose.Types.ObjectId;
  linkedAccountId?: mongoose.Types.ObjectId; // For bank loans
  linkedWalletId?: mongoose.Types.ObjectId; // For cash loans
  accountType?: 'bank' | 'cash'; // Derived from loanCategory
  status: 'active' | 'closed' | 'written-off';
  outstandingAmount: number;
  totalPaid: number;
  notes?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema = new Schema<ILoan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loanType: {
      type: String,
      enum: ['borrowed', 'given', 'hand'],
      required: true,
      index: true,
    },
    loanCategory: {
      type: String,
      enum: ['bank', 'cash'],
      required: true,
      index: true,
    },
    principal: {
      type: Number,
      required: true,
      min: 0,
    },
    interestType: {
      type: String,
      enum: ['flat', 'simple', 'compound'],
      required: true,
      default: 'flat',
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    linkedPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'Person',
      index: true,
    },
    linkedAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    linkedWalletId: {
      type: Schema.Types.ObjectId,
      ref: 'CashWallet',
    },
    accountType: {
      type: String,
      enum: ['bank', 'cash'],
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'written-off'],
      default: 'active',
      index: true,
    },
    outstandingAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'INR',
    },
  },
  {
    timestamps: true,
  }
);

// Set accountType based on loanCategory before save
LoanSchema.pre('save', function (next) {
  if (this.loanCategory === 'bank') {
    this.accountType = 'bank';
  } else if (this.loanCategory === 'cash') {
    this.accountType = 'cash';
  }
  next();
});

// Compound indexes
LoanSchema.index({ userId: 1, status: 1 });
LoanSchema.index({ userId: 1, loanCategory: 1 });
LoanSchema.index({ userId: 1, loanType: 1 });
LoanSchema.index({ linkedPersonId: 1 });
LoanSchema.index({ userId: 1, startDate: -1 });

export const Loan = mongoose.model<ILoan>('Loan', LoanSchema);

