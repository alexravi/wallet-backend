import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Only load .env file in development (when not in production and .env file exists)
// In Azure App Service, environment variables are provided directly, so we skip dotenv
const isProduction = process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME; // WEBSITE_SITE_NAME is set in Azure
const envPath = join(process.cwd(), '.env');

if (!isProduction && existsSync(envPath)) {
  dotenv.config();
}

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable (via .env file in development or environment variables in production)');
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error);
});

