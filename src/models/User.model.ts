import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshToken {
  token: string;
  deviceInfo: string;
  createdAt: Date;
}

export interface IUserPreferences {
  notifications: {
    email: boolean;
    inApp: boolean;
    push: boolean;
  };
  reminderTimings: string[];
  defaultStartScreen: string;
  weekStartDay: 'monday' | 'sunday';
}

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  currency: string;
  locale: string;
  timezone: string;
  preferences: IUserPreferences;
  refreshTokens: IRefreshToken[];
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: {
    type: String,
    required: true,
  },
  deviceInfo: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserPreferencesSchema = new Schema<IUserPreferences>({
  notifications: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  reminderTimings: { type: [String], default: [] },
  defaultStartScreen: { type: String, default: 'dashboard' },
  weekStartDay: { type: String, enum: ['monday', 'sunday'], default: 'monday' },
});

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    name: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    locale: {
      type: String,
      default: 'en-IN',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({}),
    },
    refreshTokens: {
      type: [RefreshTokenSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);

