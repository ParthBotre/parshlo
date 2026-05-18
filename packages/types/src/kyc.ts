import { z } from 'zod';

import { EntityId, Gstin, IndianMobile, IndianPin, IsoDateString, Pan } from './common.js';
import { AccountStatus, BusinessType } from './user.js';

/** Indian states & UTs (ISO-3166-2:IN codes). */
export const IndianStateCode = z.enum([
  'AN',
  'AP',
  'AR',
  'AS',
  'BR',
  'CH',
  'CT',
  'DN',
  'DD',
  'DL',
  'GA',
  'GJ',
  'HR',
  'HP',
  'JK',
  'JH',
  'KA',
  'KL',
  'LA',
  'LD',
  'MP',
  'MH',
  'MN',
  'ML',
  'MZ',
  'NL',
  'OR',
  'PY',
  'PB',
  'RJ',
  'SK',
  'TN',
  'TS',
  'TR',
  'UP',
  'UT',
  'WB',
]);
export type IndianStateCode = z.infer<typeof IndianStateCode>;

/** Business address. */
export const BusinessAddress = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: IndianStateCode,
  pin: IndianPin,
  country: z.literal('IN').default('IN'),
});
export type BusinessAddress = z.infer<typeof BusinessAddress>;

/** B2B registration payload. */
export const RegisterBusinessInput = z.object({
  businessName: z.string().trim().min(2).max(200),
  ownerName: z.string().trim().min(2).max(120),
  businessType: BusinessType,
  gstin: Gstin,
  pan: Pan.optional(),
  drugLicenseNumber: z.string().trim().min(3).max(60),
  pharmacyRegistrationNumber: z.string().trim().min(3).max(60).optional(),
  mobile: IndianMobile,
  businessEmail: z.string().email().max(254),
  address: BusinessAddress,
  // Document keys are pre-uploaded to S3 via presigned URLs; client passes the
  // returned object keys here.
  documents: z.object({
    gstCertificateKey: z.string().min(1),
    drugLicenseKey: z.string().min(1),
    pharmacyLicenseKey: z.string().min(1),
    panCardKey: z.string().min(1).optional(),
  }),
});
export type RegisterBusinessInput = z.infer<typeof RegisterBusinessInput>;

/**
 * Public B2B access request (no auth). Documents are provisioned server-side
 * as placeholders until the applicant uploads files after approval prep.
 */
export const B2BApplicationInputSchema = RegisterBusinessInput.omit({ documents: true });
export type B2BApplicationInput = z.infer<typeof B2BApplicationInputSchema>;

/** Admin-created buyer account. Staff can approve immediately or leave pending. */
export const AdminCreateBuyerInputSchema = B2BApplicationInputSchema.extend({
  accountStatus: AccountStatus.extract([
    'PENDING_VERIFICATION',
    'UNDER_REVIEW',
    'APPROVED',
  ]).default('APPROVED'),
});
export type AdminCreateBuyerInput = z.infer<typeof AdminCreateBuyerInputSchema>;

/** KYC document types we accept. */
export const KycDocumentType = z.enum([
  'GST_CERTIFICATE',
  'DRUG_LICENSE',
  'PHARMACY_LICENSE',
  'PAN_CARD',
  'OTHER',
]);
export type KycDocumentType = z.infer<typeof KycDocumentType>;

/** Presigned upload request issued by the API to the client. */
export const PresignedUploadRequest = z.object({
  documentType: KycDocumentType,
  contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024), // 10 MB
});
export type PresignedUploadRequest = z.infer<typeof PresignedUploadRequest>;

export const PresignedUploadResponse = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresIn: z.number().int().positive(),
});
export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponse>;

/** Admin decision payloads. */
export const KycApprovalInput = z.object({
  note: z.string().max(2000).optional(),
});
export const KycRejectionInput = z.object({
  reason: z.string().trim().min(5).max(2000),
});
export type KycApprovalInput = z.infer<typeof KycApprovalInput>;
export type KycRejectionInput = z.infer<typeof KycRejectionInput>;

/** Admin view of a pending KYC application. */
export const KycApplicationView = z.object({
  id: EntityId,
  userId: EntityId,
  status: z.enum(['PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
  businessName: z.string(),
  businessType: BusinessType,
  gstin: Gstin,
  drugLicenseNumber: z.string(),
  pharmacyRegistrationNumber: z.string().nullable(),
  submittedAt: IsoDateString,
  reviewedAt: IsoDateString.nullable(),
  reviewedBy: EntityId.nullable(),
  rejectionReason: z.string().nullable(),
});
export type KycApplicationView = z.infer<typeof KycApplicationView>;
