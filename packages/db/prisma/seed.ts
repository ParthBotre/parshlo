/* eslint-disable no-console */
/**
 * Parshlo dev seed.
 *
 * Populates:
 *   - 1 admin user (admin@parshlo.local)
 *   - 1 pre-approved demo buyer (buyer@parshlo.local) with a complete business profile
 *   - 16 product categories
 *   - 38 real Parshlo SKUs with placeholder prices/MOQ + best-guess compositions
 *
 * Notes for the Parshlo team:
 *   - Wholesale prices and MRP are PLACEHOLDERS. Update them with your real wholesale
 *     rates before any real buyer touches the catalog. Search for "PLACEHOLDER" below.
 *   - Compositions and `prescriptionRequired` flags are best-guess inferences from the
 *     brand name. Verify each one against your actual product master before going live.
 *   - The wipe step at the top deletes ALL invoices/orders/products. Safe in dev only.
 */
import {
  GstRate,
  PrismaClient,
  ProductForm,
  ProductStatus,
  Role,
  ScheduleDrug,
} from '@prisma/client';

const prisma = new PrismaClient();

// Price tiers in paise (₹1 = 100 paise). All marked PLACEHOLDER.
const PRICE = {
  // Essentials: low-cost basics (calcium, iron, folate, basic vitamins).
  ESSENTIAL: { wholesale: 4000n, mrp: 7500n },
  // Mid: branded NSAIDs, antifungals, antiemetics, cardiac generics.
  MID: { wholesale: 12000n, mrp: 22000n },
  // Premium: collagen, joint supplements, Rx steroids, branded combos.
  PREMIUM: { wholesale: 25000n, mrp: 45000n },
  // Topical: gels / sprays.
  TOPICAL: { wholesale: 15000n, mrp: 27500n },
  // Vit D nano shots (small single-dose).
  VITD_SHOT: { wholesale: 5000n, mrp: 11000n },
  // Protein powder ~500g pack.
  PROTEIN: { wholesale: 65000n, mrp: 105000n },
  // Protilo DM (medical nutrition for diabetics).
  PROTEIN_DM: { wholesale: 75000n, mrp: 120000n },
} as const;

/** Default manufacturer label on seeded catalog SKUs. */
const MANUFACTURER = 'Parshlo';

interface ProductSeed {
  slug: string;
  name: string;
  composition: string;
  strength: string;
  form: ProductForm;
  packaging: string;
  description: string;
  manufacturer: string;
  hsnCode: string;
  categorySlug: string;
  wholesalePricePaise: bigint;
  mrpPaise: bigint;
  gstRate: GstRate;
  moq: number;
  prescriptionRequired: boolean;
  scheduleDrug: ScheduleDrug;
}

async function main(): Promise<void> {
  console.log('🌱 Seeding Parshlo dev database...');

  // ----- Wipe products + dependent rows (dev only) -----
  await prisma.invoice.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.orderStatusEvent.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  // additional Delivery  and Consignment and Ledger Updates
  await prisma.adminConsignmentLog.deleteMany({});
  await prisma.courierLedgerStatement.deleteMany({});
  await prisma.courierPartner.deleteMany({});

  console.log('  ✓ Cleared existing products/orders/invoices');

  // courier providers
  const couriers = [
    { id: 'cld001profess00000000001', name: 'Professional Couriers' },
    { id: 'cld002tej0000000000000002', name: 'Tej Couriers' },
    { id: 'cld003mark0000000000000003', name: 'Mark Couriers' },
  ];

  for (const c of couriers) {
    await prisma.courierPartner.upsert({
      where: { id: c.id },
      update: { name: c.name, isActive: true },
      create: { id: c.id, name: c.name, isActive: true },
    });
  }
  console.log('  ✓ Seeded baseline logistics operational courier providers');

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

  // ----- Platform owner (Auth0: sign in with same email; auth0Id linked on first login) -----
  const owner = await prisma.user.upsert({
    where: { email: 'pbotre@ttu.edu' },
    update: {
      fullName: 'Parth Botre',
      roles: [Role.SUPER_ADMIN],
      accountStatus: 'APPROVED',
    },
    create: {
      auth0Id: 'pending|pbotre@ttu.edu',
      email: 'pbotre@ttu.edu',
      fullName: 'Parth Botre',
      roles: [Role.SUPER_ADMIN],
      accountStatus: 'APPROVED',
    },
  });
  console.log(`  ✓ Owner user: ${owner.email} (${owner.roles.join(', ')})`);

  // ----- Demo sales manager -----
  const manager = await prisma.user.upsert({
    where: { email: 'manager@parshlo.local' },
    update: {
      fullName: 'Parshlo Sales Manager',
      roles: [Role.SALES_MANAGER],
      accountStatus: 'APPROVED',
    },
    create: {
      auth0Id: 'dev|manager',
      email: 'manager@parshlo.local',
      fullName: 'Parshlo Sales Manager',
      roles: [Role.SALES_MANAGER],
      accountStatus: 'APPROVED',
    },
  });
  console.log(`  ✓ Sales manager user: ${manager.email} (${manager.roles.join(', ')})`);

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
      { slug: 'analgesics', name: 'Analgesics & NSAIDs' },
      { slug: 'cardiovascular', name: 'Cardiovascular' },
      { slug: 'antidiabetic', name: 'Antidiabetic' },
      { slug: 'respiratory', name: 'Respiratory' },
      { slug: 'gastrointestinal', name: 'Gastrointestinal' },
      { slug: 'bone-joint', name: 'Bone & Joint Health' },
      { slug: 'nutraceuticals', name: 'Vitamins & Nutraceuticals' },
      { slug: 'women-health', name: "Women's Health" },
      { slug: 'antifungal', name: 'Antifungals' },
      { slug: 'antiemetic', name: 'Antiemetics' },
      { slug: 'dermatology', name: 'Dermatology & Topical' },
      { slug: 'protein-supplement', name: 'Nutritional Powders' },
      { slug: 'wound-care', name: 'Wound Care & Enzymes' },
      { slug: 'muscle-relaxant', name: 'Muscle Relaxants' },
      { slug: 'corticosteroid', name: 'Corticosteroids' },
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
  // Each row maps 1:1 to a file in `apps/web/public/product-images/<slug>.<ext>`.
  // Compositions, packaging, Rx status are best-guess inferences. Verify before launch.
  const products: ProductSeed[] = [
    // --- Bone & Joint ---------------------------------------------------------
    {
      slug: 'calonest-tab',
      name: 'Calonest Tab',
      composition: 'Calcium Carbonate 500mg + Vitamin D3 250 IU',
      strength: '500mg + 250 IU',
      form: ProductForm.TABLET,
      packaging: '15 tablets/strip · 10 strips/box',
      description:
        'Calcium and Vitamin D3 supplement for bone health. Supports skeletal strength and prevents calcium deficiency.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.ESSENTIAL.wholesale,
      mrpPaise: PRICE.ESSENTIAL.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'calonest-plus-cap',
      name: 'Calonest Plus Cap',
      composition: 'Calcium Citrate 1000mg + Vitamin D3 + Vitamin K2-7 + Magnesium + Zinc',
      strength: '1000mg combo',
      form: ProductForm.CAPSULE,
      packaging: '10 capsules/strip · 10 strips/box',
      description:
        'Advanced calcium supplement with K2-7 for better calcium absorption and bone mineralization.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'calonest-xt-tab',
      name: 'Calonest XT Tab',
      composition: 'Calcium Citrate Maleate 1000mg + Vitamin D3 + Magnesium + Zinc',
      strength: '1000mg combo',
      form: ProductForm.TABLET,
      packaging: '15 tablets/strip · 10 strips/box',
      description:
        'Extended calcium formulation with magnesium and zinc for women, post-menopausal bone support and prenatal use.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'collamat-plus-tab',
      name: 'Collamat Plus Tab',
      composition: 'Undenatured Type II Collagen 40mg + Glucosamine Sulphate 750mg + MSM',
      strength: '40mg + 750mg combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Joint cartilage support formulation with collagen peptides, glucosamine and MSM for osteoarthritis management.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'cosamax-dn-tab',
      name: 'Cosamax DN Tab',
      composition: 'Diacerein 50mg + Glucosamine Sulphate 750mg',
      strength: '50mg + 750mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Cartilage-protective combination for symptomatic relief of osteoarthritis of the knee and hip.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'fracsure-tab',
      name: 'Fracsure Tab',
      composition: 'Calcitriol 0.25mcg + Calcium Carbonate 500mg + Zinc 7.5mg',
      strength: '0.25mcg combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Active Vitamin D3 (Calcitriol) with calcium and zinc for fracture recovery and metabolic bone disease.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'fracsure-plus-tab',
      name: 'Fracsure Plus Tab',
      composition:
        'Calcitriol 0.25mcg + Calcium Citrate Maleate 1000mg + Vitamin K2-7 + Magnesium + Zinc',
      strength: '0.25mcg + 1000mg combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Comprehensive bone recovery formulation with active Vitamin D3, K2-7 and trace minerals.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'tendofab-plus-cap',
      name: 'Tendofab Plus Cap',
      composition: 'Methylsulfonylmethane (MSM) + Glucosamine Sulphate + Diacerein',
      strength: 'Combo',
      form: ProductForm.CAPSULE,
      packaging: '10 capsules/strip · 10 strips/box',
      description:
        'MSM + Glucosamine + Diacerein combination capsule for chronic joint pain and inflammation.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'tendofab-plus-tab',
      name: 'Tendofab Plus Tab',
      composition: 'Methylsulfonylmethane (MSM) + Glucosamine Sulphate + Diacerein',
      strength: 'Combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'MSM + Glucosamine + Diacerein combination tablet for chronic joint pain and inflammation.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'tendofab-v-tab',
      name: 'Tendofab V Tab',
      composition: 'Methylsulfonylmethane (MSM) + Vitamin C + Undenatured Type II Collagen',
      strength: 'Combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Vegetarian joint health support with MSM, Vitamin C and undenatured Type II collagen.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'bone-joint',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },

    // --- Analgesics & NSAIDs --------------------------------------------------
    {
      slug: 'flexcel-60-tab',
      name: 'Flexcel 60 Tab',
      composition: 'Etoricoxib 60mg',
      strength: '60mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Selective COX-2 inhibitor for osteoarthritis, rheumatoid arthritis and acute pain.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'analgesics',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'flexcel-90-tab',
      name: 'Flexcel 90 Tab',
      composition: 'Etoricoxib 90mg',
      strength: '90mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'High-strength selective COX-2 inhibitor for acute gouty arthritis and severe inflammatory pain.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'analgesics',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'flexcel-eth-4-tab',
      name: 'Flexcel ETH-4 Tab',
      composition: 'Etodolac 400mg + Thiocolchicoside 4mg',
      strength: '400mg + 4mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'NSAID + muscle relaxant combination for acute musculoskeletal pain and lower back spasm.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'analgesics',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'flexcel-gel',
      name: 'Flexcel Gel',
      composition: 'Diclofenac Diethylamine 1.16% + Linseed Oil + Methyl Salicylate + Menthol',
      strength: '1.16% w/w',
      form: ProductForm.GEL,
      packaging: '30g tube',
      description:
        'Topical analgesic gel for localised joint pain, sprains, strains and soft-tissue injuries.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'analgesics',
      wholesalePricePaise: PRICE.TOPICAL.wholesale,
      mrpPaise: PRICE.TOPICAL.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'dibenza-spray',
      name: 'Dibenza Spray',
      composition: 'Diclofenac Diethylamine 1.16% + Methyl Salicylate + Menthol + Linseed Oil',
      strength: '1.16% w/w',
      form: ProductForm.OTHER,
      packaging: '50ml spray bottle',
      description:
        'Topical analgesic spray for instant relief from muscle aches, sprains and joint pain.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'analgesics',
      wholesalePricePaise: PRICE.TOPICAL.wholesale,
      mrpPaise: PRICE.TOPICAL.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },

    // --- Cardiovascular -------------------------------------------------------
    {
      slug: 'gbcard-nt-tab',
      name: 'Gbcard NT Tab',
      composition: 'Nebivolol 5mg + Telmisartan 40mg',
      strength: '5mg + 40mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description: 'Beta-blocker + ARB fixed-dose combination for hypertension management.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'cardiovascular',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'gbcard-sr-tab',
      name: 'Gbcard SR Tab',
      composition: 'Metoprolol Succinate 50mg (Sustained Release)',
      strength: '50mg SR',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description: 'Cardioselective beta-blocker (SR) for hypertension, angina and heart failure.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'cardiovascular',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Antibiotics ----------------------------------------------------------
    {
      slug: 'roxinoe-dt-tab',
      name: 'RoxiNOE DT Tab',
      composition: 'Roxithromycin 50mg (Dispersible)',
      strength: '50mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Macrolide antibiotic in dispersible tablet form (paediatric-friendly) for respiratory and ENT infections.',
      manufacturer: MANUFACTURER,
      hsnCode: '30041020',
      categorySlug: 'antibiotics',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Antifungal -----------------------------------------------------------
    {
      slug: 'itabro-200-cap',
      name: 'Itabro 200 Cap',
      composition: 'Itraconazole 200mg',
      strength: '200mg',
      form: ProductForm.CAPSULE,
      packaging: '10 capsules/strip · 10 strips/box',
      description:
        'Broad-spectrum triazole antifungal for systemic mycoses, onychomycosis and dermatophytoses.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'antifungal',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Antiemetic -----------------------------------------------------------
    {
      slug: 'dexlet-tab',
      name: 'Dexlet Tab',
      composition: 'Doxylamine Succinate 10mg',
      strength: '10mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Antiemetic and sedative antihistamine for nausea and vomiting, including in pregnancy.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'antiemetic',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'dexlet-d-cap',
      name: 'Dexlet D Cap',
      composition: 'Doxylamine Succinate 10mg + Pyridoxine HCl (Vitamin B6) 10mg',
      strength: '10mg + 10mg',
      form: ProductForm.CAPSULE,
      packaging: '10 capsules/strip · 10 strips/box',
      description:
        'Doxylamine + Pyridoxine delayed-release combination, first-line for nausea and vomiting of pregnancy.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'antiemetic',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Corticosteroid -------------------------------------------------------
    {
      slug: 'defcya-6-tab',
      name: 'Defcya 6 Tab',
      composition: 'Deflazacort 6mg',
      strength: '6mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description: 'Oral corticosteroid (calcium-sparing) for inflammatory and immune disorders.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'corticosteroid',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Muscle Relaxant ------------------------------------------------------
    {
      slug: 'tolecya-tab',
      name: 'Tolecya Tab',
      composition: 'Tolperisone HCl 150mg',
      strength: '150mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Centrally acting muscle relaxant for spasticity following stroke and musculoskeletal disorders.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'muscle-relaxant',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Wound Care -----------------------------------------------------------
    {
      slug: 'fawound-tab',
      name: 'Fawound Tab',
      composition: 'Trypsin-Chymotrypsin 50,000 AU',
      strength: '50,000 AU',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Proteolytic enzyme combination for reducing inflammation, oedema and accelerating wound healing.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'wound-care',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'fawound-ds-tab',
      name: 'Fawound DS Tab',
      composition: 'Trypsin-Chymotrypsin 100,000 AU (Double Strength)',
      strength: '100,000 AU',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Double-strength proteolytic enzymes for severe post-surgical inflammation and complex wounds.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'wound-care',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },
    {
      slug: 'fawound-plus-tab',
      name: 'Fawound Plus Tab',
      composition: 'Trypsin-Chymotrypsin 50,000 AU + Diclofenac 50mg + Paracetamol 325mg',
      strength: 'Combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Triple-action enzyme + NSAID + paracetamol combination for post-operative pain, swelling and tissue repair.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'wound-care',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: true,
      scheduleDrug: ScheduleDrug.SCHEDULE_H,
    },

    // --- Vitamins & Nutraceuticals -------------------------------------------
    {
      slug: 'cumigold-cap',
      name: 'Cumigold Cap',
      composition: 'Curcumin (95% Curcuminoids) 500mg + Piperine 5mg',
      strength: '500mg + 5mg',
      form: ProductForm.CAPSULE,
      packaging: '10 capsules/strip · 10 strips/box',
      description:
        'High-potency turmeric extract with piperine for enhanced absorption. Natural anti-inflammatory and antioxidant support.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'nutraceuticals',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'ezyrol-d3-60k-cap',
      name: 'Ezyrol D3 60K Cap',
      composition: 'Cholecalciferol (Vitamin D3) 60,000 IU',
      strength: '60,000 IU',
      form: ProductForm.CAPSULE,
      packaging: '4 capsules/strip',
      description: 'Weekly high-dose Vitamin D3 for correction of severe Vitamin D deficiency.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'nutraceuticals',
      wholesalePricePaise: PRICE.ESSENTIAL.wholesale,
      mrpPaise: PRICE.ESSENTIAL.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'ezyrol-nano-shots',
      name: 'Ezyrol Nano Shots',
      composition: 'Cholecalciferol (Vitamin D3) 60,000 IU — Nano Liquid',
      strength: '60,000 IU / 5ml',
      form: ProductForm.OTHER,
      packaging: '5ml shot · 4 shots/pack',
      description:
        'Rapid-absorption nano-emulsion of Vitamin D3 in single-dose oral shots for faster onset and improved bioavailability.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'nutraceuticals',
      wholesalePricePaise: PRICE.VITD_SHOT.wholesale,
      mrpPaise: PRICE.VITD_SHOT.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'ironest-tab',
      name: 'Ironest Tab',
      composition: 'Ferrous Ascorbate 100mg + Folic Acid 1.5mg',
      strength: '100mg + 1.5mg',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Iron + folate supplement for iron-deficiency anaemia, including during pregnancy.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'nutraceuticals',
      wholesalePricePaise: PRICE.ESSENTIAL.wholesale,
      mrpPaise: PRICE.ESSENTIAL.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'upfolet-plus-tab',
      name: 'Upfolet Plus Tab',
      composition:
        'L-Methylfolate 1mg + Methylcobalamin (Vitamin B12) 1500mcg + Pyridoxal-5-Phosphate (Vitamin B6)',
      strength: '1mg + 1500mcg combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Active forms of folate, B12 and B6 for hyperhomocysteinaemia, neuropathy and preconception care.',
      manufacturer: MANUFACTURER,
      hsnCode: '30049099',
      categorySlug: 'nutraceuticals',
      wholesalePricePaise: PRICE.MID.wholesale,
      mrpPaise: PRICE.MID.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },

    // --- Women's Health -------------------------------------------------------
    {
      slug: 'femsure-tab',
      name: 'Femsure Tab',
      composition:
        'Myo-Inositol 550mg + D-Chiro-Inositol 13.8mg + Folic Acid 200mcg + Vitamin D3 + Chromium',
      strength: 'Combo',
      form: ProductForm.TABLET,
      packaging: '10 tablets/strip · 10 strips/box',
      description:
        'Inositol-based combination for PCOS / PCOD management, ovarian function and metabolic support.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'women-health',
      wholesalePricePaise: PRICE.PREMIUM.wholesale,
      mrpPaise: PRICE.PREMIUM.mrp,
      gstRate: GstRate.TWELVE,
      moq: 10,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },

    // --- Protein Powders / Medical Nutrition ---------------------------------
    {
      slug: 'protilo-dm',
      name: 'Protilo DM Powder',
      composition:
        'Whey + Soy Protein Isolate + Slow-release Carbs + Fibre + Vitamins/Minerals (no added sugar)',
      strength: '200g protein/kg',
      form: ProductForm.POWDER,
      packaging: '400g tin',
      description:
        'Specialised oral nutrition supplement for people with diabetes. Slow-release energy, no added sugar.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'protein-supplement',
      wholesalePricePaise: PRICE.PROTEIN_DM.wholesale,
      mrpPaise: PRICE.PROTEIN_DM.mrp,
      gstRate: GstRate.EIGHTEEN,
      moq: 6,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'protilo-chocolate',
      name: 'Protilo Chocolate Powder',
      composition: 'Whey Protein Concentrate + Vitamins/Minerals — Chocolate Flavour',
      strength: '200g protein/kg',
      form: ProductForm.POWDER,
      packaging: '500g tin',
      description:
        'Daily nutritional protein powder with chocolate flavour. Supports adult nutrition, recovery and muscle maintenance.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'protein-supplement',
      wholesalePricePaise: PRICE.PROTEIN.wholesale,
      mrpPaise: PRICE.PROTEIN.mrp,
      gstRate: GstRate.EIGHTEEN,
      moq: 6,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'protilo-vanilla',
      name: 'Protilo Vanilla Powder',
      composition: 'Whey Protein Concentrate + Vitamins/Minerals — Vanilla Flavour',
      strength: '200g protein/kg',
      form: ProductForm.POWDER,
      packaging: '500g tin',
      description:
        'Daily nutritional protein powder with vanilla flavour. Supports adult nutrition, recovery and muscle maintenance.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'protein-supplement',
      wholesalePricePaise: PRICE.PROTEIN.wholesale,
      mrpPaise: PRICE.PROTEIN.mrp,
      gstRate: GstRate.EIGHTEEN,
      moq: 6,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'protilo-sf',
      name: 'Protilo SF Powder',
      composition: 'Whey Protein Concentrate + Vitamins/Minerals (Sugar-Free, unflavoured)',
      strength: '200g protein/kg',
      form: ProductForm.POWDER,
      packaging: '500g tin',
      description:
        'Sugar-free, unflavoured protein powder for adults preferring a neutral taste. Ideal for diabetics and calorie-conscious users.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'protein-supplement',
      wholesalePricePaise: PRICE.PROTEIN.wholesale,
      mrpPaise: PRICE.PROTEIN.mrp,
      gstRate: GstRate.EIGHTEEN,
      moq: 6,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'protilo-sf-chocolate',
      name: 'Protilo SF Chocolate Powder',
      composition: 'Whey Protein Concentrate + Vitamins/Minerals — Chocolate Flavour (Sugar-Free)',
      strength: '200g protein/kg',
      form: ProductForm.POWDER,
      packaging: '500g tin',
      description:
        'Sugar-free protein powder with rich chocolate flavour. Diabetic-friendly daily nutrition.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'protein-supplement',
      wholesalePricePaise: PRICE.PROTEIN.wholesale,
      mrpPaise: PRICE.PROTEIN.mrp,
      gstRate: GstRate.EIGHTEEN,
      moq: 6,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
    },
    {
      slug: 'protilo-sf-kesar',
      name: 'Protilo SF Kesar Powder',
      composition:
        'Whey Protein Concentrate + Vitamins/Minerals — Kesar (Saffron) Flavour (Sugar-Free)',
      strength: '200g protein/kg',
      form: ProductForm.POWDER,
      packaging: '500g tin',
      description:
        'Sugar-free protein powder with traditional kesar flavour. Diabetic-friendly Indian taste profile.',
      manufacturer: MANUFACTURER,
      hsnCode: '21069099',
      categorySlug: 'protein-supplement',
      wholesalePricePaise: PRICE.PROTEIN.wholesale,
      mrpPaise: PRICE.PROTEIN.mrp,
      gstRate: GstRate.EIGHTEEN,
      moq: 6,
      prescriptionRequired: false,
      scheduleDrug: ScheduleDrug.NONE,
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
