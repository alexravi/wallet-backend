import mongoose, { Document, Schema } from 'mongoose';

export interface ICategoryLimit {
  categoryId: mongoose.Types.ObjectId;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface IPerson extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'child' | 'friend' | 'employee' | 'family' | 'other';
  notes?: string;
  overallLimit?: number;
  limitPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  categoryLimits: ICategoryLimit[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryLimitSchema = new Schema<ICategoryLimit>({
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
    default: 'monthly',
  },
});

const PersonSchema = new Schema<IPerson>(
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
    type: {
      type: String,
      enum: ['child', 'friend', 'employee', 'family', 'other'],
      required: true,
      default: 'other',
    },
    notes: {
      type: String,
      trim: true,
    },
    overallLimit: {
      type: Number,
      min: 0,
    },
    limitPeriod: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    categoryLimits: {
      type: [CategoryLimitSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PersonSchema.index({ userId: 1, name: 1 }, { unique: true });
PersonSchema.index({ userId: 1, isActive: 1 });

export const Person = mongoose.model<IPerson>('Person', PersonSchema);

