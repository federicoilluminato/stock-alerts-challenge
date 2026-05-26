import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-at-least-16-chars';
process.env.FINNHUB_API_KEY ??= 'test-finnhub-key';

describe('health route', () => {
  it('returns ok', async () => {
    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
