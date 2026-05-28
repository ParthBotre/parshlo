import { describe, expect, it } from 'vitest';

import {
  AdminCreateBuyerInputSchema,
  AdminUpdateBuyerInputSchema,
  B2BApplicationInputSchema,
  RegisterBusinessInput,
} from '../kyc.js';

const validApplication = {
  businessName: 'Apex Pharmacy Pvt Ltd',
  ownerName: 'Rajesh Kumar',
  businessType: 'CHEMIST' as const,
  gstin: '29AAFCA1234A1Z5',
  drugLicenseNumber: 'KA-BLR-20A-12345',
  pharmacyRegistrationNumber: 'KSPC-2018-9876',
  mobile: '9876543210',
  businessEmail: 'orders@apex-pharmacy.local',
  address: {
    line1: '12, MG Road',
    city: 'Bengaluru',
    state: 'KA' as const,
    pin: '560001',
    country: 'IN' as const,
  },
};

describe('RegisterBusinessInput', () => {
  const valid = {
    businessName: 'Apex Pharmacy Pvt Ltd',
    ownerName: 'Rajesh Kumar',
    businessType: 'CHEMIST',
    gstin: '29AAFCA1234A1Z5',
    drugLicenseNumber: 'KA-BLR-20A-12345',
    pharmacyRegistrationNumber: 'KSPC-2018-9876',
    mobile: '9876543210',
    businessEmail: 'orders@apex-pharmacy.local',
    address: {
      line1: '12, MG Road, Brigade Plaza',
      city: 'Bengaluru',
      state: 'KA',
      pin: '560001',
      country: 'IN',
    },
    documents: {
      gstCertificateKey: 'kyc/x/gst.pdf',
      drugLicenseKey: 'kyc/x/drug.pdf',
      pharmacyLicenseKey: 'kyc/x/pharm.pdf',
    },
  };

  it('accepts a valid B2B registration', () => {
    const parsed = RegisterBusinessInput.parse(valid);
    expect(parsed.gstin).toBe('29AAFCA1234A1Z5');
  });

  it('rejects an invalid GSTIN', () => {
    expect(() => RegisterBusinessInput.parse({ ...valid, gstin: 'BAD-GST' })).toThrow();
  });

  it('rejects unknown business types', () => {
    expect(() =>
      RegisterBusinessInput.parse({ ...valid, businessType: 'GROCERY' as never }),
    ).toThrow();
  });

  it('rejects an invalid Indian PIN', () => {
    expect(() =>
      RegisterBusinessInput.parse({ ...valid, address: { ...valid.address, pin: '060001' } }),
    ).toThrow();
  });
});

describe('B2BApplicationInput', () => {
  it('accepts registration without document keys', () => {
    const { documents: _documents, ...application } = {
      ...validApplication,
      documents: {
        gstCertificateKey: 'kyc/x/gst.pdf',
        drugLicenseKey: 'kyc/x/drug.pdf',
        pharmacyLicenseKey: 'kyc/x/pharm.pdf',
      },
    };
    const parsed = B2BApplicationInputSchema.parse(application);
    expect(parsed.ownerName).toBe('Rajesh Kumar');
  });

  it('accepts applications without a PIN code', () => {
    const parsed = B2BApplicationInputSchema.parse({
      ...validApplication,
      address: { ...validApplication.address, pin: '' },
    });
    expect(parsed.address.pin).toBe('');
  });
});

describe('Admin buyer GSTIN input', () => {
  it('allows admins to create buyers without a GSTIN', () => {
    const parsed = AdminCreateBuyerInputSchema.parse({ ...validApplication, gstin: '' });
    expect(parsed.gstin).toBe('');
  });

  it('allows existing unregistered GSTIN placeholders during admin edits', () => {
    const parsed = AdminUpdateBuyerInputSchema.parse({ gstin: 'unregistered-001' });
    expect(parsed.gstin).toBe('UNREGISTERED-001');
  });

  it('allows plain unregistered input so the API can allocate the next sequence', () => {
    const parsed = AdminUpdateBuyerInputSchema.parse({ gstin: 'UNREGISTERED' });
    expect(parsed.gstin).toBe('UNREGISTERED');
  });

  it('still rejects invalid GSTIN text for admin buyer edits', () => {
    expect(() => AdminUpdateBuyerInputSchema.parse({ gstin: 'BAD-GST' })).toThrow();
  });
});
