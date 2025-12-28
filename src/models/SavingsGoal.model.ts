import mongoose, { Document, Schema } from 'mongoose';

export interface ISavingsGoal extends Document {
  userId: mongoose.Types.ObjectId;
  goalName: string;
  targetAmount: number;
  targetDate?: Date;
  priority: 'low' | 'medium' | 'high';
  currentAmount: number;
  linkedAccountId?: mongoose.Types.ObjectId;
  linkedWalletId?: mongoose.Types.ObjectId;
  accountType?: 'bank' | 'cash' | 'all';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currency: string;
  autoContribution?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goalName: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    targetDate: {
      type: Date,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    currentAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
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
      enum: ['bank', 'cash', 'all'],
      default: 'all',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'INR',
    },
    autoContribution: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SavingsGoalSchema.index({ userId: 1, status: 1 });
SavingsGoalSchema.index({ userId: 1, priority: 1 });
SavingsGoalSchema.index({ userId: 1, targetDate: 1 });

export const SavingsGoal = mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);

