import mongoose, { Document, Schema } from 'mongoose';

export interface ISavingsContribution extends Document {
  goalId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  contributionDate: Date;
  transactionId?: mongoose.Types.ObjectId;
  sourceAccountId?: mongoose.Types.ObjectId;
  sourceAccountType?: 'bank' | 'cash';
  notes?: string;
  isAutoContribution?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsContributionSchema = new Schema<ISavingsContribution>(
  {
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'SavingsGoal',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    contributionDate: {
      type: Date,
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    sourceAccountId: {
      type: Schema.Types.ObjectId,
    },
    sourceAccountType: {
      type: String,
      enum: ['bank', 'cash'],
    },
    notes: {
      type: String,
      trim: true,
    },
    isAutoContribution: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SavingsContributionSchema.index({ goalId: 1, contributionDate: -1 });
SavingsContributionSchema.index({ userId: 1, contributionDate: -1 });
SavingsContributionSchema.index({ transactionId: 1 });

export const SavingsContribution = mongoose.model<ISavingsContribution>('SavingsContribution', SavingsContributionSchema);

