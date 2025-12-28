import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  getProfile,
  updateProfile,
  updatePreferences,
  changePassword,
  getSessions,
  revokeSession,
  revokeAllSessions,
} from '../services/profile.service';

export const getProfileController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await getProfile(req.user.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        currency: user.currency,
        locale: user.locale,
        timezone: user.timezone,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to get profile',
    });
  }
};

export const updateProfileController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, email, currency, locale, timezone } = req.body;

    const user = await updateProfile(req.user.userId, {
      name,
      email,
      currency,
      locale,
      timezone,
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        currency: user.currency,
        locale: user.locale,
        timezone: user.timezone,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    if (error.message === 'Email is already in use') {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({
      error: error.message || 'Failed to update profile',
    });
  }
};

export const updatePreferencesController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { notifications, reminderTimings, defaultStartScreen, weekStartDay } = req.body;

    const user = await updatePreferences(req.user.userId, {
      notifications,
      reminderTimings,
      defaultStartScreen,
      weekStartDay,
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Preferences updated successfully',
      data: {
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to update preferences',
    });
  }
};

export const changePasswordController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    await changePassword(req.user.userId, {
      oldPassword,
      newPassword,
    });

    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    if (error.message === 'Current password is incorrect') {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({
      error: error.message || 'Failed to change password',
    });
  }
};

export const getSessionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const refreshToken = req.body.refreshToken || req.query.refreshToken as string;
    const sessions = await getSessions(req.user.userId, refreshToken);

    res.status(200).json({
      data: {
        sessions,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to get sessions',
    });
  }
};

export const revokeSessionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { sessionId } = req.params;

    await revokeSession(req.user.userId, sessionId);

    res.status(200).json({
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to revoke session',
    });
  }
};

export const revokeAllSessionsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    await revokeAllSessions(req.user.userId, refreshToken);

    res.status(200).json({
      message: 'All sessions revoked successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to revoke sessions',
    });
  }
};

