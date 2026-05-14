/* eslint-disable no-console */
import { GstRate, PrismaClient, ProductForm, ProductStatus, Role, ScheduleDrug } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding Parshlo dev database...');

  // ----- Admin user -----
  const admin = await prisma.user.upsert({
    where: { email: 'admin@parshlo.local' },
    update: {},
    create: {
      auth0Id: 'dev|admin',
      email: 'admin@parshlo.local',
      fullName: 'Parshlo Admin',
      roles: [Role.ADMIN],
      accountStatus: 'APPROVED',
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // ----- Demo buyer (pre-approved, with business profile for end-to-end demo) -----
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@parshlo.local' },
    update: {},
    create: {
      auth0Id: 'dev|buyer',
      email: 'buyer@parshlo.local',
      fullName: 'Demo Buyer (Apex Pharmacy)',
      roles: [Role.BUYER],
      accountStatus: 'APPROVED',
      businessProfile: {
        create: {
          businessName: 'Apex Pharmacy Pvt Ltd',
          businessType: 'PHARMACY',
          gstin: '29AAFCA1234A1Z5',
          pan: 'AAFCA1234A',
          drugLicenseNumber: 'KA-BLR-20A-12345',
          pharmacyRegistrationNumber: 'KSPC-2018-9876',
          mobile: '9876543210',
          businessEmail: 'orders@apex-pharmacy.local',
          addressLine1: '12, MG Road, Brigade Plaza',
          city: 'Bengaluru',
          state: 'KA',
          pin: '560001',
        },
      },
    },
  });
  console.log(`  ✓ Demo buyer: ${buyer.email}`);

  // ----- Categories -----
  const categories = await Promise.all(
    [
      { slug: 'antibiotics', name: 'Antibiotics' },
      { slug: 'analgesics', name: 'Analgesics & Antipyretics' },
      { slug: 'cardiovascular', name: 'Cardiovascular' },
      { slug: 'antidiabetic', name: 'Antidiabetic' },
      { slug: 'respiratory', name: 'Respiratory' },
      { slug: 'gastrointestinal', name: 'Gastrointestinal' },
    ].map((c) =>
      prisma.productCategory.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      }),
    ),
  );
  console.log(`  ✓ ${categories.length} categories`);

  // ----- Products -----
  const products = [
    {
      slug: 'amoxicillin-500',
      name: 'Amoxicillin 500mg',
      composition: 'Amoxicillin Trihydrate 500mg',
      strength: '500mg',
      form: ProductForm.CAPSULE,
      packaging: '10x10 capsules (Strip)',
      description:
        'Broad-spectrum penicillin antibiotic for treatment of bacterial infections.',
      manufacturer: 'Parshlo Pharma',
      hsnCode: '30041020',
      categorySlug: 'antibiotics',
      wholesalePricePaise: 4500n,
      mrpPaise: 7800n,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'paracetamol-650',
      name: 'Paracetamol 650mg',
      composition: 'Paracetamol IP 650mg',
      strength: '650mg',
      form: ProductForm.TABLET,
      packaging: '15 tablets/strip · 10 strips/box',
      description: 'Analgesic and antipyretic for relief of fever and mild-to-moderate pain.',
      manufacturer: 'Parshlo Pharma',
      hsnCode: '30049099',
      categorySlug: 'analgesics',
      wholesalePricePaise: 1800n,
      mrpPaise: 3200n,
      gstRate: GstRate.TWELVE,
      moq: 20,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'metformin-500',
      name: 'Metformin HCl 500mg',
      composition: 'Metformin Hydrochloride 500mg',
      strength: '500mg',
      form: ProductForm.TABLET,
      packaging: '15 tablets/strip · 10 strips/box',
      description: 'First-line oral antidiabetic agent for type 2 diabetes mellitus.',
      manufacturer: 'Parshlo Pharma',
      hsnCode: '30049099',
      categorySlug: 'antidiabetic',
      wholesalePricePaise: 2200n,
      mrpPaise: 4500n,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'salbutamol-inhaler',
      name: 'Salbutamol Inhaler 100mcg',
      composition: 'Salbutamol Sulfate 100mcg/dose',
      strength: '100mcg',
      form: ProductForm.INHALER,
      packaging: '200 doses per inhaler',
      description:
        'Short-acting β2-agonist bronchodilator for relief of bronchospasm in asthma and COPD.',
      manufacturer: 'Parshlo Pharma',
      hsnCode: '30049099',
      categorySlug: 'respiratory',
      wholesalePricePaise: 9500n,
      mrpPaise: 14500n,
      gstRate: GstRate.TWELVE,
      moq: 5,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'pantoprazole-40',
      name: 'Pantoprazole 40mg',
      composition: 'Pantoprazole Sodium 40mg',
      strength: '40mg',
      form: ProductForm.TABLET,
      packaging: '15 tablets/strip · 10 strips/box',
      description: 'Proton pump inhibitor for acid-related gastrointestinal disorders.',
      manufacturer: 'Parshlo Pharma',
      hsnCode: '30049099',
      categorySlug: 'gastrointestinal',
      wholesalePricePaise: 3200n,
      mrpPaise: 6800n,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'amlodipine-5',
      name: 'Amlodipine 5mg',
      composition: 'Amlodipine Besylate 5mg',
      strength: '5mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description: 'Calcium channel blocker for hypertension and chronic stable angina.',
      manufacturer: 'Parshlo Pharma',
      hsnCode: '30049099',
      categorySlug: 'cardiovascular',
      wholesalePricePaise: 1500n,
      mrpPaise: 3000n,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
  ];

  for (const p of products) {
    const category = await prisma.productCategory.findUniqueOrThrow({
      where: { slug: p.categorySlug },
    });
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        composition: p.composition,
        strength: p.strength,
        form: p.form,
        packaging: p.packaging,
        description: p.description,
        manufacturer: p.manufacturer,
        hsnCode: p.hsnCode,
        categoryId: category.id,
        imageKeys: [],
        prescriptionRequired: p.prescriptionRequired,
        scheduleDrug: p.scheduleDrug,
        wholesalePricePaise: p.wholesalePricePaise,
        mrpPaise: p.mrpPaise,
        gstRate: p.gstRate,
        moq: p.moq,
        status: ProductStatus.ACTIVE,
        inventory: {
          create: {
            availableQty: 5000,
            reservedQty: 0,
            reorderLevel: 200,
          },
        },
      },
    });
  }
  console.log(`  ✓ ${products.length} products`);

  console.log('✅ Seed complete.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
