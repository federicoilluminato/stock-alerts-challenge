import { describe, expect, it } from 'vitest';
import { createAlertSchema, deleteAlertParamsSchema } from '../src/modules/alerts/alerts.schemas.js';
import { authCredentialsSchema } from '../src/modules/auth/auth.schemas.js';

describe('request schemas', () => {
  it('normalizes valid auth credentials', () => {
    const result = authCredentialsSchema.parse({
      email: 'USER@EXAMPLE.COM ',
      password: '12345678',
    });

    expect(result).toEqual({
      email: 'user@example.com',
      password: '12345678',
    });
  });

  it('rejects short passwords', () => {
    expect(() => authCredentialsSchema.parse({ email: 'user@example.com', password: '123' })).toThrow();
  });

  it('accepts valid alert creation payloads', () => {
    const result = createAlertSchema.parse({
      symbol: 'AAPL',
      targetPrice: 200,
    });

    expect(result).toEqual({
      symbol: 'AAPL',
      targetPrice: 200,
    });
  });

  it('rejects invalid alert prices', () => {
    expect(() => createAlertSchema.parse({ symbol: 'AAPL', targetPrice: 0 })).toThrow();
  });

  it('allows non-CUID alert ids for delete route compatibility', () => {
    expect(deleteAlertParamsSchema.parse({ id: 'alert-id' })).toEqual({ id: 'alert-id' });
  });
});
