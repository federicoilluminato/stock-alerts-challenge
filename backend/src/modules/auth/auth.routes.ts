import { Router } from 'express';
import { requireAuth } from './auth.middleware.js';
import { authCredentialsSchema } from './auth.schemas.js';
import { loginUser, registerUser } from './auth.service.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const credentials = authCredentialsSchema.parse(req.body);
    const authResponse = await loginUser(credentials.email, credentials.password);

    res.json(authResponse);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const credentials = authCredentialsSchema.parse(req.body);
    const authResponse = await registerUser(credentials.email, credentials.password);

    res.status(201).json(authResponse);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.status(204).send();
});
