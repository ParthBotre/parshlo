import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = process.env;

describe('worker config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://parshlo:parshlo@localhost:5432/parshlo',
      REDIS_URL: 'redis://localhost:6379',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('keeps deferred workers disabled by default', async () => {
    delete process.env.EMAIL_NOTIFICATIONS_ENABLED;
    delete process.env.INVOICE_GENERATION_ENABLED;

    const { config } = await import('../config.js');

    expect(config.EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    expect(config.INVOICE_GENERATION_ENABLED).toBe(false);
  });

  it('parses enabled notification flags explicitly', async () => {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true';
    process.env.INVOICE_GENERATION_ENABLED = 'true';

    const { config } = await import('../config.js');

    expect(config.EMAIL_NOTIFICATIONS_ENABLED).toBe(true);
    expect(config.INVOICE_GENERATION_ENABLED).toBe(true);
  });
});
