import mongoose, { Document, Schema } from 'mongoose';

export interface ISplitDetail {
  personId: mongoose.Types.ObjectId;
  amount: number;
  percentage?: number;
}

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  accountType: 'bank' | 'cash';
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  category?: mongoose.Types.ObjectId | string; // Support both ObjectId and string for backward compatibility
  notes?: string;
  attachments?: string[]; // Array of file paths/URLs
  personId?: mongoose.Types.ObjectId;
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
  referenceNumber?: string;
  duplicateCheckHash: string;
  transferToAccountId?: mongoose.Types.ObjectId; // For transfer transactions
  parentTransactionId?: mongoose.Types.ObjectId; // For split child transactions
  groupId?: mongoose.Types.ObjectId; // Link transaction to a group
  settlementId?: mongoose.Types.ObjectId; // Link to settlement if transaction is a settlement
  splitType?: 'none' | 'equal' | 'percentage' | 'custom'; // Only on parent transactions
  splitDetails?: ISplitDetail[]; // Stores split configuration on parent transaction
  deletedAt?: Date; // Soft delete
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    accountType: {
      type: String,
      enum: ['bank', 'cash'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'INR',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.Mixed, // Support both ObjectId and string
      ref: 'Category',
    },
    notes: {
      type: String,
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    personId: {
      type: Schema.Types.ObjectId,
      ref: 'Person',
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    duplicateCheckHash: {
      type: String,
      required: true,
      index: true,
    },
    transferToAccountId: {
      type: Schema.Types.ObjectId,
      refPath: 'accountType', // Dynamic reference
    },
    parentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      index: true,
    },
    settlementId: {
      type: Schema.Types.ObjectId,
      ref: 'Settlement',
      index: true,
    },
    splitType: {
      type: String,
      enum: ['none', 'equal', 'percentage', 'custom'],
    },
    splitDetails: {
      type: [
        {
          personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          percentage: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
      default: [],
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, accountId: 1, date: -1 });
TransactionSchema.index({ userId: 1, accountType: 1, date: -1 });
TransactionSchema.index({ userId: 1, duplicateCheckHash: 1 });
TransactionSchema.index({ userId: 1, personId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1, date: -1 });
TransactionSchema.index({ userId: 1, deletedAt: 1 });
TransactionSchema.index({ parentTransactionId: 1 });
TransactionSchema.index({ groupId: 1 });
TransactionSchema.index({ settlementId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

