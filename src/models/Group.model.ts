import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'trip' | 'fees' | 'event' | 'custom';
  startDate?: Date;
  endDate?: Date;
  budget?: number; // Optional budget amount
  currency: string;
  members: mongoose.Types.ObjectId[]; // Array of Person IDs
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
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
      enum: ['trip', 'fees', 'event', 'custom'],
      required: true,
      default: 'custom',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    budget: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'INR',
    },
    members: {
      type: [Schema.Types.ObjectId],
      ref: 'Person',
      default: [],
    },
    notes: {
      type: String,
      trim: true,
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
GroupSchema.index({ userId: 1, isActive: 1 });
GroupSchema.index({ userId: 1, type: 1 });

// Validation: endDate must be after startDate
GroupSchema.pre('save', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

export const Group = mongoose.model<IGroup>('Group', GroupSchema);

