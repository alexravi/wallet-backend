import mongoose, { Document, Schema } from 'mongoose';

export interface ILoanPayment extends Document {
  loanId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  paymentType: 'emi' | 'partial' | 'prepayment' | 'irregular';
  amount: number;
  principalAmount: number;
  interestAmount: number;
  paymentDate: Date;
  transactionId?: mongoose.Types.ObjectId;
  emiScheduleId?: mongoose.Types.ObjectId;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const LoanPaymentSchema = new Schema<ILoanPayment>(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paymentType: {
      type: String,
      enum: ['emi', 'partial', 'prepayment', 'irregular'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    principalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    interestAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    emiScheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'EMISchedule',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
LoanPaymentSchema.index({ loanId: 1, paymentDate: -1 });
LoanPaymentSchema.index({ userId: 1, paymentDate: -1 });
LoanPaymentSchema.index({ emiScheduleId: 1 });
LoanPaymentSchema.index({ transactionId: 1 });

export const LoanPayment = mongoose.model<ILoanPayment>('LoanPayment', LoanPaymentSchema);

