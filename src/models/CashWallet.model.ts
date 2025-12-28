import mongoose, { Document, Schema } from 'mongoose';

export interface ICashWallet extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  status: 'active' | 'archived';
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashWalletSchema = new Schema<ICashWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
    color: {
      type: String,
      trim: true,
      match: /^#[0-9A-F]{6}$/i,
    },
    icon: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for userId and status
CashWalletSchema.index({ userId: 1, status: 1 });

// Compound index for userId and name (unique per user)
CashWalletSchema.index({ userId: 1, name: 1 }, { unique: true });

export const CashWallet = mongoose.model<ICashWallet>('CashWallet', CashWalletSchema);

