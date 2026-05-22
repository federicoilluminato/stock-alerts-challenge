import { z } from 'zod';

export const createAlertSchema = z.object({
  symbol: z.string().trim().min(1).max(10),
  targetPrice: z.number().positive(),
  direction: z.enum(['above', 'below']).optional().default('above'),
});

export const deleteAlertParamsSchema = z.object({
  id: z.string().cuid(),
});
