import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobProducer } from '@parshlo/queue';
import {
  type B2BApplicationInput,
  type KycApprovalInput,
  type KycRejectionInput,
  type RegisterBusinessInput,
  Role,
} from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class KycService {
  private readonly log = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobProducer,
    private readonly config: ConfigService,
  ) {}

  /**
   * Public B2B access request: creates (or reuses) a pending buyer user, then
   * opens a KYC application for admin review.
   */
  async applyForAccess(input: B2BApplicationInput): Promise<{ applicationId: string }> {
    const email = input.businessEmail.trim().toLowerCase();
    const gstConflict = await this.prisma.businessProfile.findUnique({
      where: { gstin: input.gstin },
      include: { user: true },
    });
    if (gstConflict && gstConflict.user.email !== email) {
      throw new ConflictException({
        code: 'GSTIN_ALREADY_REGISTERED',
        message: 'A business with this GSTIN has already registered.',
      });
    }

    let userId: string;
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictException({
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'This email cannot be used. Contact support.',
        });
      }
      if (existing.accountStatus === 'APPROVED') {
        throw new ConflictException({
          code: 'ALREADY_APPROVED',
          message: 'An approved account already exists for this email. Sign in instead.',
        });
      }
      if (!existing.roles.includes(Role.enum.BUYER)) {
        throw new ConflictException({
          code: 'EMAIL_IN_USE',
          message: 'This email is associated with another account type.',
        });
      }
      userId = existing.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { fullName: input.ownerName },
      });
    } else {
      const created = await this.prisma.user.create({
        data: {
          auth0Id: `pending|${email}`,
          email,
          fullName: input.ownerName,
          roles: ['BUYER'],
          accountStatus: 'PENDING_VERIFICATION',
        },
      });
      userId = created.id;
    }

    const docPrefix = `applications/${userId}`;
    return this.register(userId, {
      ...input,
      businessEmail: email,
      documents: {
        gstCertificateKey: `${docPrefix}/gst-certificate.pending`,
        drugLicenseKey: `${docPrefix}/drug-license.pending`,
        pharmacyLicenseKey: `${docPrefix}/pharmacy-license.pending`,
        ...(input.pan ? { panCardKey: `${docPrefix}/pan-card.pending` } : {}),
      },
    });
  }

  /**
   * Submit a B2B registration. Creates the business profile and a pending
   * KycApplication record. Documents are referenced by S3 object keys that
   * the client uploaded via presigned URLs.
   */
  async register(userId: string, input: RegisterBusinessInput): Promise<{ applicationId: string }> {
    // GST must be globally unique; surface a clean error instead of a DB constraint trap.
    const existing = await this.prisma.businessProfile.findUnique({
      where: { gstin: input.gstin },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictException({
        code: 'GSTIN_ALREADY_REGISTERED',
        message: 'A business with this GSTIN has already registered.',
      });
    }

    const application = await this.prisma.$transaction(async (tx) => {
      await tx.businessProfile.upsert({
        where: { userId },
        create: {
          userId,
          businessName: input.businessName,
          businessType: input.businessType,
          gstin: input.gstin,
          pan: input.pan ?? null,
          drugLicenseNumber: input.drugLicenseNumber,
          pharmacyRegistrationNumber: input.pharmacyRegistrationNumber,
          mobile: input.mobile,
          businessEmail: input.businessEmail,
          addressLine1: input.address.line1,
          addressLine2: input.address.line2 ?? null,
          city: input.address.city,
          state: input.address.state,
          pin: input.address.pin?.trim() ? input.address.pin.trim() : null,
          country: input.address.country,
        },
        update: {
          businessName: input.businessName,
          businessType: input.businessType,
          pan: input.pan ?? null,
          drugLicenseNumber: input.drugLicenseNumber,
          pharmacyRegistrationNumber: input.pharmacyRegistrationNumber,
          mobile: input.mobile,
          businessEmail: input.businessEmail,
          addressLine1: input.address.line1,
          addressLine2: input.address.line2 ?? null,
          city: input.address.city,
          state: input.address.state,
          pin: input.address.pin?.trim() ? input.address.pin.trim() : null,
          country: input.address.country,
        },
      });

      // Block resubmission while an application is already pending/under review.
      const pending = await tx.kycApplication.findFirst({
        where: {
          userId,
          status: { in: ['PENDING_VERIFICATION', 'UNDER_REVIEW'] },
        },
      });
      if (pending) {
        throw new ConflictException({
          code: 'KYC_ALREADY_PENDING',
          message: 'A KYC application is already in review for this account.',
        });
      }

      const created = await tx.kycApplication.create({
        data: {
          userId,
          status: 'PENDING_VERIFICATION',
          documents: {
            createMany: {
              data: [
                {
                  documentType: 'GST_CERTIFICATE',
                  s3Bucket: '',
                  s3Key: input.documents.gstCertificateKey,
                  contentType: 'application/pdf',
                  sizeBytes: 0,
                  sha256: '',
                },
                {
                  documentType: 'DRUG_LICENSE',
                  s3Bucket: '',
                  s3Key: input.documents.drugLicenseKey,
                  contentType: 'application/pdf',
                  sizeBytes: 0,
                  sha256: '',
                },
                {
                  documentType: 'PHARMACY_LICENSE',
                  s3Bucket: '',
                  s3Key: input.documents.pharmacyLicenseKey,
                  contentType: 'application/pdf',
                  sizeBytes: 0,
                  sha256: '',
                },
                ...(input.documents.panCardKey
                  ? [
                      {
                        documentType: 'PAN_CARD' as const,
                        s3Bucket: '',
                        s3Key: input.documents.panCardKey,
                        contentType: 'application/pdf',
                        sizeBytes: 0,
                        sha256: '',
                      },
                    ]
                  : []),
              ],
            },
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { accountStatus: 'UNDER_REVIEW' },
      });

      return created;
    });

    return { applicationId: application.id };
  }

  async approve(applicationId: string, reviewerId: string, input: KycApprovalInput): Promise<void> {
    const app = await this.prisma.kycApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw new NotFoundException({ code: 'KYC_NOT_FOUND' });
    }
    if (app.status === 'APPROVED' || app.status === 'REJECTED') {
      throw new ForbiddenException({
        code: 'KYC_ALREADY_DECIDED',
        message: 'This application has already been reviewed.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.kycApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          reviewerNote: input.note ?? null,
        },
      }),
      this.prisma.user.update({
        where: { id: app.userId },
        data: { accountStatus: 'APPROVED' },
      }),
    ]);

    if (this.config.get<boolean>('features.emailNotificationsEnabled') === true) {
      void this.jobs
        .enqueueKycDecision({ applicationId, decision: 'APPROVED' })
        .catch((err: unknown) => this.log.error({ err }, 'KYC approval enqueue failed'));
    }
  }

  async reject(applicationId: string, reviewerId: string, input: KycRejectionInput): Promise<void> {
    const app = await this.prisma.kycApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) {
      throw new NotFoundException({ code: 'KYC_NOT_FOUND' });
    }
    await this.prisma.$transaction([
      this.prisma.kycApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          rejectionReason: input.reason,
        },
      }),
      this.prisma.user.update({
        where: { id: app.userId },
        data: { accountStatus: 'REJECTED' },
      }),
    ]);

    if (this.config.get<boolean>('features.emailNotificationsEnabled') === true) {
      void this.jobs
        .enqueueKycDecision({
          applicationId,
          decision: 'REJECTED',
          reason: input.reason,
        })
        .catch((err: unknown) => this.log.error({ err }, 'KYC rejection enqueue failed'));
    }
  }
}
