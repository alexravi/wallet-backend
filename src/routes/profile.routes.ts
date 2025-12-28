import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProfileController,
  updateProfileController,
  updatePreferencesController,
  changePasswordController,
  getSessionsController,
  revokeSessionController,
  revokeAllSessionsController,
} from '../controllers/profile.controller';

const router = Router();

// Validation rules
const updateProfileValidation = [
  body('name').optional().trim().isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter ISO code')
    .isUppercase()
    .withMessage('Currency must be uppercase'),
  body('locale')
    .optional()
    .matches(/^[a-z]{2}-[A-Z]{2}$/)
    .withMessage('Locale must be in format: en-US'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),
];

const updatePreferencesValidation = [
  body('notifications.email').optional().isBoolean().withMessage('Email notification must be a boolean'),
  body('notifications.inApp').optional().isBoolean().withMessage('In-app notification must be a boolean'),
  body('notifications.push').optional().isBoolean().withMessage('Push notification must be a boolean'),
  body('reminderTimings')
    .optional()
    .isArray()
    .withMessage('Reminder timings must be an array'),
  body('reminderTimings.*')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Reminder timing must be in format HH:mm'),
  body('defaultStartScreen')
    .optional()
    .isString()
    .isIn(['dashboard', 'transactions', 'profile'])
    .withMessage('Default start screen must be a valid screen name'),
  body('weekStartDay')
    .optional()
    .isIn(['monday', 'sunday'])
    .withMessage('Week start day must be either monday or sunday'),
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// Routes
/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getProfileController);

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               currency:
 *                 type: string
 *               locale:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/', authenticate, validate(updateProfileValidation), updateProfileController);

/**
 * @swagger
 * /api/profile/preferences:
 *   put:
 *     summary: Update user preferences
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   inApp:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *               reminderTimings:
 *                 type: array
 *                 items:
 *                   type: string
 *               defaultStartScreen:
 *                 type: string
 *               weekStartDay:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/preferences', authenticate, validate(updatePreferencesValidation), updatePreferencesController);

/**
 * @swagger
 * /api/profile/password:
 *   put:
 *     summary: Change password
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or incorrect password
 *       401:
 *         description: Unauthorized
 */
router.put('/password', authenticate, validate(changePasswordValidation), changePasswordController);

/**
 * @swagger
 * /api/profile/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authenticate, getSessionsController);

/**
 * @swagger
 * /api/profile/sessions/:sessionId:
 *   delete:
 *     summary: Revoke a specific session
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/sessions/:sessionId', authenticate, revokeSessionController);

/**
 * @swagger
 * /api/profile/sessions/revoke-all:
 *   post:
 *     summary: Revoke all sessions except current
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: All sessions revoked successfully
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Unauthorized
 */
router.post('/sessions/revoke-all', authenticate, revokeAllSessionsController);

export default router;

