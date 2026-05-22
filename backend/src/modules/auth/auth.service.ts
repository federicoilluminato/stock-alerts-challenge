import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { prisma } from '../../prisma/client.js';
import type { AuthUser, JwtPayload } from './auth.types.js';

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

const PASSWORD_SALT_ROUNDS = 12;

const toAuthUser = (user: { id: string; email: string }): AuthUser => ({
  id: user.id,
  email: user.email,
});

export const signAccessToken = (user: AuthUser): string => {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
  };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

export const registerUser = async (email: string, password: string): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  const authUser = toAuthUser(user);

  return {
    user: authUser,
    accessToken: signAccessToken(authUser),
  };
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const authUser = toAuthUser(user);

  return {
    user: authUser,
    accessToken: signAccessToken(authUser),
  };
};
