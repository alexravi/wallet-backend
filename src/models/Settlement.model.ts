import mongoose, { Document, Schema } from 'mongoose';

export interface ISettlement extends Document {
  userId: mongoose.Types.ObjectId;
  fromPersonId: mongoose.Types.ObjectId; // Who owes
  toPersonId: mongoose.Types.ObjectId; // Who is owed
  amount: number;
  currency: string;
  status: 'pending' | 'settled' | 'cancelled';
  settlementMethod?: 'bank' | 'cash' | 'other';
  settlementDate?: Date;
  notes?: string;
  transactionId?: mongoose.Types.ObjectId; // Settlement transaction if created
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'Person',
      required: true,
      index: true,
    },
    toPersonId: {
      type: Schema.Types.ObjectId,
      ref: 'Person',
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
    status: {
      type: String,
      enum: ['pending', 'settled', 'cancelled'],
      default: 'pending',
      index: true,
    },
    settlementMethod: {
      type: String,
      enum: ['bank', 'cash', 'other'],
    },
    settlementDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SettlementSchema.index({ userId: 1, status: 1 });
SettlementSchema.index({ userId: 1, fromPersonId: 1, toPersonId: 1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);

