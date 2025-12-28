import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'system' | 'custom';
  icon?: string;
  color?: string;
  isArchived: boolean;
  parentCategoryId?: mongoose.Types.ObjectId;
  keywords?: string[]; // For auto-application during parsing
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
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
      enum: ['system', 'custom'],
      required: true,
      default: 'custom',
    },
    icon: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    keywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
CategorySchema.index({ userId: 1, name: 1 }, { unique: true });
CategorySchema.index({ userId: 1, isArchived: 1 });
CategorySchema.index({ userId: 1, type: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

