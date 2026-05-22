import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default('*'),
  FINNHUB_API_KEY: z.string(),
});

export const env = envSchema.parse(process.env);

