import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { apiRateLimitMiddleware } from '../src/middlewares/rate-limit.middleware.js';

describe('rate limiting', () => {
  it('adds standard rate limit headers', async () => {
    const app = express();
    app.use(apiRateLimitMiddleware);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const response = await request(app).get('/test').expect(200);

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });
});
