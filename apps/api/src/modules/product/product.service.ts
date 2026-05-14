import { Injectable, NotFoundException } from '@nestjs/common';
import { type GstRate as PrismaGstRate } from '@parshlo/db';
import {
  type BuyerProductView,
  type GstRate,
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

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<PublicProductView[]> {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
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
    const p = await this.prisma.product.findFirst({
      where: { slug, status: 'ACTIVE', deletedAt: null },
      include: { category: true },
    });
    if (!p) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND' });
    }
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
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

  async listForBuyer(): Promise<BuyerProductView[]> {
    const products = await this.prisma.product.findMany({
      where: { status: { in: ['ACTIVE', 'OUT_OF_STOCK'] }, deletedAt: null },
      include: { category: true, inventory: true },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
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
      wholesalePricePaise: Number(p.wholesalePricePaise),
      mrpPaise: Number(p.mrpPaise),
      gstRate: GST_RATE_MAP[p.gstRate],
      moq: p.moq,
      availableQty: p.inventory?.availableQty ?? 0,
      batchInfo: null,
    }));
  }
}
