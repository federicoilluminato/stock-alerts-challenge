import type { RequestHandler } from 'express';
import { AppError } from '../../middlewares/error.middleware.js';
import { verifyAccessToken } from './auth.service.js';
import type { AuthUser } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!token) {
    return next(new AppError(401, 'Missing bearer token'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    return next();
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }
};

