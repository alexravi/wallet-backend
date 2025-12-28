import mongoose, { Document, Schema } from 'mongoose';

export interface IEMISchedule extends Document {
  loanId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  emiNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'missed' | 'skipped';
  paymentId?: mongoose.Types.ObjectId;
  paidDate?: Date;
  isEarlyClosure?: boolean;
  penaltyAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const EMIScheduleSchema = new Schema<IEMISchedule>(
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
    emiNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
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
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'missed', 'skipped'],
      default: 'pending',
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'LoanPayment',
      index: true,
    },
    paidDate: {
      type: Date,
      index: true,
    },
    isEarlyClosure: {
      type: Boolean,
      default: false,
    },
    penaltyAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
EMIScheduleSchema.index({ loanId: 1, dueDate: 1 });
EMIScheduleSchema.index({ loanId: 1, emiNumber: 1 });
EMIScheduleSchema.index({ userId: 1, status: 1, dueDate: 1 }); // For missed EMI queries
EMIScheduleSchema.index({ userId: 1, dueDate: 1 }); // For upcoming EMIs

export const EMISchedule = mongoose.model<IEMISchedule>('EMISchedule', EMIScheduleSchema);

