import mongoose, { Document, Schema } from 'mongoose';

export interface IParsedTransaction {
  date: Date;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  referenceNumber?: string;
  balance?: number;
  isDuplicate?: boolean;
  matchingTransactionId?: mongoose.Types.ObjectId;
}

export interface IBankStatement extends Document {
  userId: mongoose.Types.ObjectId;
  bankAccountId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: 'pdf' | 'csv';
  filePath?: string;
  uploadDate: Date;
  parseStatus: 'pending' | 'parsing' | 'completed' | 'failed';
  transactionCount: number;
  parsedTransactions: IParsedTransaction[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParsedTransactionSchema = new Schema<IParsedTransaction>(
  {
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    balance: {
      type: Number,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    matchingTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  { _id: false }
);

const BankStatementSchema = new Schema<IBankStatement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bankAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'csv'],
      required: true,
    },
    filePath: {
      type: String,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    parseStatus: {
      type: String,
      enum: ['pending', 'parsing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    transactionCount: {
      type: Number,
      default: 0,
    },
    parsedTransactions: {
      type: [ParsedTransactionSchema],
      default: [],
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for userId and parseStatus
BankStatementSchema.index({ userId: 1, parseStatus: 1 });
BankStatementSchema.index({ userId: 1, bankAccountId: 1, uploadDate: -1 });

export const BankStatement = mongoose.model<IBankStatement>('BankStatement', BankStatementSchema);

