import { Injectable, NotFoundException } from '@nestjs/common';
import { type BusinessType, type GstRate as PrismaGstRate } from '@parshlo/db';
import {
  type AdminProductView,
  type BuyerProductView,
  type GstRate,
  type ProductStatus,
  type ProductWriteInput,
  type ProductPriceTier,
  type PublicProductView,
} from '@parshlo/types';

import { PrismaService } from '../prisma/prisma.service.js';

const GST_RATE_MAP: Record<PrismaGstRate, GstRate> = {
  ZERO: '0',
  FIVE: '5',
  TWELVE: '12',
  EIGHTEEN: '18',
  TWENTYEIGHT: '28',
};

const GST_RATE_TO_PRISMA: Record<GstRate, PrismaGstRate> = {
  '0': 'ZERO',
  '5': 'FIVE',
  '12': 'TWELVE',
  '18': 'EIGHTEEN',
  '28': 'TWENTYEIGHT',
};

const ADMIN_ONLY_PRODUCT_SLUGS = ['tremecya-tab', 'tremecya-d-tab'] as const;

export function priceTierForBusinessType(businessType?: BusinessType | null): ProductPriceTier {
  return businessType === 'PHARMACY' || businessType === 'HOSPITAL' ? 'RATE_B' : 'RATE_A';
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  private static slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private async uniqueSlug(name: string, existingProductId?: string): Promise<string> {
    const base = ProductService.slugify(name) || 'product';
    let slug = base;
    let suffix = 2;
    for (;;) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === existingProductId) {
        return slug;
      }
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private toAdminProductView(
    p: Parameters<ProductService['toBuyerProductView']>[0],
  ): AdminProductView {
    return {
      ...this.toBuyerProductView(p, 'RATE_A'),
      hsnCode: p.hsnCode ?? '',
      imageKeys: p.imageKeys,
      deletedAt: p.deletedAt?.toISOString() ?? null,
    };
  }

  private toBuyerProductView(
    p: {
      id: string;
      slug: string;
      name: string;
      composition: string;
      strength: string;
      form: BuyerProductView['form'];
      packaging: string;
      description: string;
      category: { name: string };
      manufacturer: string;
      imageKeys: string[];
      prescriptionRequired: boolean;
      scheduleDrug: BuyerProductView['scheduleDrug'];
      status: ProductStatus;
      wholesalePricePaise: bigint;
      rateAPaise: bigint;
      rateBPaise: bigint;
      mrpPaise: bigint;
      gstRate: PrismaGstRate;
      moq: number;
      inventory?: { availableQty: number } | null;
      hsnCode?: string;
      deletedAt?: Date | null;
    },
    tier: ProductPriceTier,
  ): BuyerProductView {
    const rateA = Number(p.rateAPaise || p.wholesalePricePaise);
    const rateB = Number(p.rateBPaise || p.wholesalePricePaise);
    const selectedPrice = tier === 'RATE_B' ? rateB : rateA;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name.toUpperCase(),
      composition: p.composition,
      strength: p.strength,
      form: p.form,
      packaging: p.packaging,
      description: p.description,
      category: p.category.name,
      manufacturer: p.manufacturer,
      imageUrls: [],
      prescriptionRequired: p.prescriptionRequired,
      scheduleDrug: p.scheduleDrug,
      status: p.status,
      wholesalePricePaise: selectedPrice,
      rateAPaise: rateA,
      rateBPaise: rateB,
      priceTier: tier,
      mrpPaise: Number(p.mrpPaise),
      gstRate: GST_RATE_MAP[p.gstRate],
      moq: p.moq,
      availableQty: p.inventory?.availableQty ?? 0,
      batchInfo: null,
    };
  }

  async listPublic(): Promise<PublicProductView[]> {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        slug: { notIn: [...ADMIN_ONLY_PRODUCT_SLUGS] },
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name.toUpperCase(),
      composition: p.composition,
      strength: p.strength,
      form: p.form,
      packaging: p.packaging,
      description: p.description,
      category: p.category.name,
      manufacturer: p.manufacturer,
      imageUrls: [], // resolved by web layer via signed URLs in production
      prescriptionRequired: p.prescriptionRequired,
      scheduleDrug: p.scheduleDrug,
      status: p.status,
    }));
  }

  async getPublicBySlug(slug: string): Promise<PublicProductView> {
    if ((ADMIN_ONLY_PRODUCT_SLUGS as readonly string[]).includes(slug)) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
    }
    const p = await this.prisma.product.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: { category: true },
    });
    if (!p) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
    }
    return {
      id: p.id,
      slug: p.slug,
      name: p.name.toUpperCase(),
      composition: p.composition,
      strength: p.strength,
      form: p.form,
      packaging: p.packaging,
      description: p.description,
      category: p.category.name,
      manufacturer: p.manufacturer,
      imageUrls: [],
      prescriptionRequired: p.prescriptionRequired,
      scheduleDrug: p.scheduleDrug,
      status: p.status,
    };
  }

  async listForBuyer(
    businessType?: BusinessType | null,
    options: { includeAdminOnly?: boolean } = {},
  ): Promise<BuyerProductView[]> {
    const tier = priceTierForBusinessType(businessType);
    const products = await this.prisma.product.findMany({
      where: {
        status: { in: ['ACTIVE', 'OUT_OF_STOCK'] },
        deletedAt: null,
        ...(options.includeAdminOnly ? {} : { slug: { notIn: [...ADMIN_ONLY_PRODUCT_SLUGS] } }),
      },
      include: { category: true, inventory: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => this.toBuyerProductView(p, tier));
  }

  async listForAdmin(): Promise<AdminProductView[]> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { category: true, inventory: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => this.toAdminProductView(p));
  }

  async createAdminProduct(input: ProductWriteInput): Promise<AdminProductView> {
    const category = await this.prisma.productCategory.upsert({
      where: { slug: ProductService.slugify(input.category) || 'uncategorized' },
      create: {
        slug: ProductService.slugify(input.category) || 'uncategorized',
        name: input.category.trim(),
      },
      update: { name: input.category.trim() },
    });
    const rateA = BigInt(input.rateAPaise ?? input.wholesalePricePaise);
    const rateB = BigInt(input.rateBPaise ?? input.wholesalePricePaise);
    const product = await this.prisma.product.create({
      data: {
        slug: await this.uniqueSlug(input.name),
        name: input.name.trim().toUpperCase(),
        composition: input.composition.trim(),
        strength: input.strength.trim(),
        form: input.form,
        packaging: input.packaging.trim(),
        description: input.description.trim(),
        manufacturer: input.manufacturer.trim(),
        hsnCode: input.hsnCode.trim(),
        categoryId: category.id,
        imageKeys: input.imageKeys,
        prescriptionRequired: input.prescriptionRequired,
        scheduleDrug: input.scheduleDrug,
        wholesalePricePaise: BigInt(input.wholesalePricePaise),
        rateAPaise: rateA,
        rateBPaise: rateB,
        mrpPaise: BigInt(input.mrpPaise),
        gstRate: GST_RATE_TO_PRISMA[input.gstRate],
        moq: input.moq,
        status: input.status,
        inventory: { create: { availableQty: 0, reservedQty: 0, reorderLevel: 0 } },
      },
      include: { category: true, inventory: true },
    });
    return this.toAdminProductView(product);
  }

  async updateAdminProduct(id: string, input: ProductWriteInput): Promise<AdminProductView> {
    const existing = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
    }
    const category = await this.prisma.productCategory.upsert({
      where: { slug: ProductService.slugify(input.category) || 'uncategorized' },
      create: {
        slug: ProductService.slugify(input.category) || 'uncategorized',
        name: input.category.trim(),
      },
      update: { name: input.category.trim() },
    });
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        slug: await this.uniqueSlug(input.name, id),
        name: input.name.trim().toUpperCase(),
        composition: input.composition.trim(),
        strength: input.strength.trim(),
        form: input.form,
        packaging: input.packaging.trim(),
        description: input.description.trim(),
        manufacturer: input.manufacturer.trim(),
        hsnCode: input.hsnCode.trim(),
        categoryId: category.id,
        imageKeys: input.imageKeys,
        prescriptionRequired: input.prescriptionRequired,
        scheduleDrug: input.scheduleDrug,
        wholesalePricePaise: BigInt(input.wholesalePricePaise),
        rateAPaise: BigInt(input.rateAPaise ?? input.wholesalePricePaise),
        rateBPaise: BigInt(input.rateBPaise ?? input.wholesalePricePaise),
        mrpPaise: BigInt(input.mrpPaise),
        gstRate: GST_RATE_TO_PRISMA[input.gstRate],
        moq: input.moq,
        status: input.status,
      },
      include: { category: true, inventory: true },
    });
    return this.toAdminProductView(product);
  }
}
