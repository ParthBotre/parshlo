import { describe, expect, it } from 'vitest';

import { GenerateInvoiceJob, KycDecisionJob, SendEmailJob } from '../payloads.js';

describe('SendEmailJob', () => {
  it('accepts a single recipient', () => {
    const p = SendEmailJob.parse({
      kind: 'ORDER_PLACED_BUYER',
      to: 'buyer@example.com',
      data: {},
    });
    expect(p.to).toBe('buyer@example.com');
  });

  it('accepts multiple recipients', () => {
    const p = SendEmailJob.parse({
      kind: 'ORDER_PLACED_ADMIN',
      to: ['admin1@x.com', 'admin2@x.com'],
      data: {},
    });
    expect(Array.isArray(p.to)).toBe(true);
  });

  it('rejects empty recipient array', () => {
    expect(() =>
      SendEmailJob.parse({ kind: 'ORDER_PLACED_BUYER', to: [], data: {} }),
    ).toThrow();
  });

  it('rejects unknown kinds', () => {
    expect(() =>
      SendEmailJob.parse({ kind: 'NOPE' as unknown as 'ORDER_PLACED_BUYER', to: 'a@b.com', data: {} }),
    ).toThrow();
  });
});

describe('GenerateInvoiceJob', () => {
  it('requires UUID orderId', () => {
    expect(() => GenerateInvoiceJob.parse({ orderId: 'not-uuid' })).toThrow();
    expect(
      GenerateInvoiceJob.parse({ orderId: '11111111-1111-1111-1111-111111111111' }).orderId,
    ).toBe('11111111-1111-1111-1111-111111111111');
  });
});

describe('KycDecisionJob', () => {
  it('accepts APPROVED without reason', () => {
    expect(
      KycDecisionJob.parse({
        applicationId: '11111111-1111-1111-1111-111111111111',
        decision: 'APPROVED',
      }).decision,
    ).toBe('APPROVED');
  });

  it('accepts REJECTED with reason', () => {
    const parsed = KycDecisionJob.parse({
      applicationId: '11111111-1111-1111-1111-111111111111',
      decision: 'REJECTED',
      reason: 'GSTIN does not match drug license',
    });
    expect(parsed.reason).toContain('GSTIN');
  });
});
