import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, IUser, IUserPreferences } from '../models/User.model';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
}

export interface UpdatePreferencesData {
  notifications?: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  };
  reminderTimings?: string[];
  defaultStartScreen?: string;
  weekStartDay?: 'monday' | 'sunday';
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  createdAt: Date;
  isCurrent: boolean;
}

const SALT_ROUNDS = 10;

export const getProfile = async (userId: string): Promise<IUser | null> => {
  const user = await User.findById(userId).select('-password -refreshTokens');
  if (!user) {
    return null;
  }

  // Ensure defaults are set if they don't exist
  if (!user.currency) {
    user.currency = 'INR';
  }
  if (!user.locale) {
    user.locale = 'en-IN';
  }
  if (!user.timezone) {
    user.timezone = 'Asia/Kolkata';
  }
  if (!user.preferences) {
    user.preferences = {
      notifications: { email: true, inApp: true, push: true },
      reminderTimings: [],
      defaultStartScreen: 'dashboard',
      weekStartDay: 'monday',
    };
  }

  return user;
};

export const updateProfile = async (
  userId: string,
  data: UpdateProfileData
): Promise<IUser | null> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Check if email is being changed and if it's already taken
  if (data.email && data.email.toLowerCase() !== user.email) {
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error('Email is already in use');
    }
    user.email = data.email.toLowerCase();
  }

  if (data.name !== undefined) {
    user.name = data.name || undefined;
  }

  if (data.currency) {
    user.currency = data.currency.toUpperCase();
  }

  if (data.locale) {
    user.locale = data.locale;
  }

  if (data.timezone) {
    user.timezone = data.timezone;
  }

  await user.save();
  return await User.findById(userId).select('-password -refreshTokens');
};

export const updatePreferences = async (
  userId: string,
  data: UpdatePreferencesData
): Promise<IUser | null> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.preferences) {
    user.preferences = {
      notifications: { email: true, inApp: true, push: true },
      reminderTimings: [],
      defaultStartScreen: 'dashboard',
      weekStartDay: 'monday',
    };
  }

  if (data.notifications) {
    if (data.notifications.email !== undefined) {
      user.preferences.notifications.email = data.notifications.email;
    }
    if (data.notifications.inApp !== undefined) {
      user.preferences.notifications.inApp = data.notifications.inApp;
    }
    if (data.notifications.push !== undefined) {
      user.preferences.notifications.push = data.notifications.push;
    }
  }

  if (data.reminderTimings !== undefined) {
    user.preferences.reminderTimings = data.reminderTimings;
  }

  if (data.defaultStartScreen) {
    user.preferences.defaultStartScreen = data.defaultStartScreen;
  }

  if (data.weekStartDay) {
    user.preferences.weekStartDay = data.weekStartDay;
  }

  await user.save();
  return await User.findById(userId).select('-password -refreshTokens');
};

export const changePassword = async (
  userId: string,
  data: ChangePasswordData
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify old password
  const isPasswordValid = await bcrypt.compare(data.oldPassword, user.password);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
  user.password = hashedPassword;

  await user.save();
};

const getSessionId = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
};

export const getSessions = async (
  userId: string,
  currentRefreshToken?: string
): Promise<SessionInfo[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return user.refreshTokens.map((token) => ({
    id: getSessionId(token.token),
    deviceInfo: token.deviceInfo,
    createdAt: token.createdAt,
    isCurrent: currentRefreshToken ? token.token === currentRefreshToken : false,
  }));
};

export const revokeSession = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.refreshTokens = user.refreshTokens.filter(
    (token) => getSessionId(token.token) !== sessionId
  );

  await user.save();
};

export const revokeAllSessions = async (
  userId: string,
  currentRefreshToken: string
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Keep only the current session
  user.refreshTokens = user.refreshTokens.filter(
    (token) => token.token === currentRefreshToken
  );

  await user.save();
};

