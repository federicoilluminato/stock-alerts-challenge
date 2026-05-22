import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { prisma } from '../../prisma/client.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['expo', 'fcm', 'apns']).optional().default('expo'),
});

notificationsRouter.post('/tokens', async (req, res, next) => {
  try {
    const { token, platform } = registerTokenSchema.parse(req.body);

    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.user!.id, platform },
      create: { userId: req.user!.id, token, platform },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
