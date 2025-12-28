import bcrypt from 'bcrypt';
import { User, IUser } from '../models/User.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt.util';
import { seedDefaultCategories } from './category.service';

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

const SALT_ROUNDS = 10;

const getDeviceInfo = (req: any): string => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  return userAgent.substring(0, 100); // Limit length
};

export const registerUser = async (
  data: RegisterData,
  req: any
): Promise<AuthResponse> => {
  const { email, password } = data;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = new User({
    email: email.toLowerCase(),
    password: hashedPassword,
  });

  await user.save();

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const deviceInfo = getDeviceInfo(req);
  user.refreshTokens.push({
    token: refreshToken,
    deviceInfo,
    createdAt: new Date(),
  });

  await user.save();

  // Seed default categories for new user
  try {
    await seedDefaultCategories(user._id.toString());
  } catch (error) {
    console.error('Failed to seed default categories:', error);
    // Don't fail registration if category seeding fails
  }

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

export const loginUser = async (
  data: LoginData,
  req: any
): Promise<AuthResponse> => {
  const { email, password } = data;

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const deviceInfo = getDeviceInfo(req);
  user.refreshTokens.push({
    token: refreshToken,
    deviceInfo,
    createdAt: new Date(),
  });

  await user.save();

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

export const logoutUser = async (userId: string, refreshToken: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Remove the specific refresh token
  user.refreshTokens = user.refreshTokens.filter(
    (token) => token.token !== refreshToken
  );

  await user.save();
};

export const logoutAllDevices = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Remove all refresh tokens
  user.refreshTokens = [];
  await user.save();
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find user and verify token exists in database
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new Error('User not found');
  }

  const tokenExists = user.refreshTokens.some(
    (token) => token.token === refreshToken
  );

  if (!tokenExists) {
    throw new Error('Invalid refresh token');
  }

  // Generate new tokens
  const tokenPayload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  // Replace old refresh token with new one
  const tokenIndex = user.refreshTokens.findIndex(
    (token) => token.token === refreshToken
  );
  if (tokenIndex !== -1) {
    user.refreshTokens[tokenIndex].token = newRefreshToken;
    user.refreshTokens[tokenIndex].createdAt = new Date();
  }

  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const getUserById = async (userId: string): Promise<IUser | null> => {
  return await User.findById(userId).select('-password -refreshTokens');
};

