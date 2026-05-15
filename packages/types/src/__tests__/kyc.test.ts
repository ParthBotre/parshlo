import { describe, expect, it } from 'vitest';

import { B2BApplicationInputSchema, RegisterBusinessInput } from '../kyc.js';

describe('RegisterBusinessInput', () => {
  const valid = {
    businessName: 'Apex Pharmacy Pvt Ltd',
    businessType: 'PHARMACY',
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
      RegisterBusinessInput.parse({ ...valid, businessType: 'GROCERY' as unknown as 'PHARMACY' }),
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
      businessName: 'Apex Pharmacy Pvt Ltd',
      ownerName: 'Rajesh Kumar',
      businessType: 'PHARMACY' as const,
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
      documents: {
        gstCertificateKey: 'kyc/x/gst.pdf',
        drugLicenseKey: 'kyc/x/drug.pdf',
        pharmacyLicenseKey: 'kyc/x/pharm.pdf',
      },
    };
    const parsed = B2BApplicationInputSchema.parse(application);
    expect(parsed.ownerName).toBe('Rajesh Kumar');
  });
});
