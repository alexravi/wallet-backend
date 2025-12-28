import mongoose, { Document, Schema } from 'mongoose';

export interface IBankAccount extends Document {
  userId: mongoose.Types.ObjectId;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'checking' | 'current';
  branchName?: string;
  ifscCode?: string;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  status: 'active' | 'archived';
  isManual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'current'],
      required: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    isManual: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for userId and status
BankAccountSchema.index({ userId: 1, status: 1 });

// Compound index for userId and accountNumber (unique per user)
BankAccountSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });

export const BankAccount = mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

