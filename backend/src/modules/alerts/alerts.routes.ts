import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { createAlertSchema, deleteAlertParamsSchema } from './alerts.schemas.js';
import { createAlert, deleteAlert, listAlerts } from './alerts.service.js';

export const alertsRouter = Router();

alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res, next) => {
  try {
    const alerts = await listAlerts(req.user!.id);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

alertsRouter.post('/', async (req, res, next) => {
  try {
    const data = createAlertSchema.parse(req.body);
    const alert = await createAlert(req.user!.id, data);
    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
});

alertsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { id } = deleteAlertParamsSchema.parse(req.params);
    await deleteAlert(req.user!.id, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
