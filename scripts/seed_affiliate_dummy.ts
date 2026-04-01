import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DUMMY_CUSTOMERS = [
  { name: 'Affiliate Alpha', email: 'affiliate.alpha@dummy.com', phone: '081200000101' },
  { name: 'Affiliate Beta', email: 'affiliate.beta@dummy.com', phone: '081200000102' },
  { name: 'Affiliate Gamma', email: 'affiliate.gamma@dummy.com', phone: '081200000103' },
  { name: 'Affiliate Delta', email: 'affiliate.delta@dummy.com', phone: '081200000104' },
  { name: 'Affiliate Epsilon', email: 'affiliate.epsilon@dummy.com', phone: '081200000105' },
];

function createCode(customerIndex: number, packageIndex: number) {
  return `AFFD-${String(customerIndex + 1).padStart(2, '0')}-${String(packageIndex + 1).padStart(2, '0')}`;
}

async function ensureBaseData() {
  let domain = await prisma.domain.findFirst({ where: { extension: '.com' } });
  if (!domain) {
    domain = await prisma.domain.create({
      data: {
        extension: '.com',
        price: 150000,
        isActive: true,
      },
    });
  }

  let packages = await prisma.package.findMany({
    where: { isActive: true },
    orderBy: [{ isPopular: 'desc' }, { createdAt: 'asc' }],
    take: 3,
  });

  if (packages.length === 0) {
    packages = await Promise.all([
      prisma.package.create({
        data: {
          name: 'Starter',
          price: 1200000,
          duration: 1,
          features: 'Hosting 1GB\nSSL Gratis\nSupport Email',
          isPopular: false,
          isActive: true,
        },
      }),
      prisma.package.create({
        data: {
          name: 'Growth',
          price: 2200000,
          duration: 2,
          features: 'Hosting 5GB\nSSL Gratis\nSupport Priority',
          isPopular: true,
          isActive: true,
        },
      }),
      prisma.package.create({
        data: {
          name: 'Scale',
          price: 3200000,
          duration: 3,
          features: 'Hosting 10GB\nSSL Gratis\nSupport 24/7',
          isPopular: false,
          isActive: true,
        },
      }),
    ]);
  }

  return { domain, packages };
}

async function seedAffiliateData() {
  console.log('Seeding affiliate dummy data...');

  const { domain, packages } = await ensureBaseData();

  for (let cIdx = 0; cIdx < DUMMY_CUSTOMERS.length; cIdx += 1) {
    const customerSeed = DUMMY_CUSTOMERS[cIdx];

    const customer = await prisma.customer.upsert({
      where: { email: customerSeed.email },
      update: {
        name: customerSeed.name,
        phone: customerSeed.phone,
        status: 'ACTIVE',
      },
      create: {
        name: customerSeed.name,
        email: customerSeed.email,
        phone: customerSeed.phone,
        status: 'ACTIVE',
      },
    });

    const bankAccount = await prisma.affiliateBankAccount.upsert({
      where: { customerId: customer.id },
      update: {
        bankName: cIdx % 2 === 0 ? 'BCA' : 'Mandiri',
        accountNumber: `987654321${cIdx}`,
        accountHolderName: customer.name,
        branch: cIdx % 2 === 0 ? 'Jakarta' : 'Bandung',
      },
      create: {
        customerId: customer.id,
        bankName: cIdx % 2 === 0 ? 'BCA' : 'Mandiri',
        accountNumber: `987654321${cIdx}`,
        accountHolderName: customer.name,
        branch: cIdx % 2 === 0 ? 'Jakarta' : 'Bandung',
        isVerified: cIdx % 3 !== 0,
        verifiedAt: cIdx % 3 !== 0 ? new Date() : null,
        verifiedBy: cIdx % 3 !== 0 ? 'seed-script' : null,
      },
    });

    for (let pIdx = 0; pIdx < packages.length; pIdx += 1) {
      const pkg = packages[pIdx];
      const code = createCode(cIdx, pIdx);

      const link = await prisma.affiliateLink.upsert({
        where: {
          customerId_packageId: {
            customerId: customer.id,
            packageId: pkg.id,
          },
        },
        update: {
          code,
          isActive: true,
          clicks: 60 + cIdx * 17 + pIdx * 13,
          conversions: 6 + cIdx + pIdx,
        },
        create: {
          customerId: customer.id,
          packageId: pkg.id,
          code,
          isActive: true,
          clicks: 60 + cIdx * 17 + pIdx * 13,
          conversions: 6 + cIdx + pIdx,
        },
      });

      const existingVisits = await prisma.affiliateVisit.count({ where: { affiliateLinkId: link.id } });
      if (existingVisits < 10) {
        const visitsToCreate = Array.from({ length: 10 - existingVisits }).map((_, i) => ({
          affiliateLinkId: link.id,
          ipAddress: `10.0.${cIdx}.${i + 1}`,
          userAgent: 'Dummy Browser',
          referrer: 'https://google.com',
        }));

        await prisma.affiliateVisit.createMany({ data: visitsToCreate });
      }

      const monthlyTotal = (pkg.price1Year || pkg.price) + cIdx * 25000 + pIdx * 50000;

      const paidInvoice = `INV-AFFD-PAID-${cIdx + 1}-${pIdx + 1}`;
      await prisma.order.upsert({
        where: { invoiceId: paidInvoice },
        update: {
          total: monthlyTotal,
          subtotal: monthlyTotal,
          discount: 0,
          status: 'PAID',
          paidAt: new Date(),
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          affiliateLinkId: link.id,
          packageId: pkg.id,
          domainId: domain.id,
          domainName: `aff${cIdx + 1}${pIdx + 1}.dummy.com`,
        },
        create: {
          invoiceId: paidInvoice,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          domainName: `aff${cIdx + 1}${pIdx + 1}.dummy.com`,
          domainId: domain.id,
          packageId: pkg.id,
          affiliateLinkId: link.id,
          subtotal: monthlyTotal,
          total: monthlyTotal,
          discount: 0,
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      const pendingInvoice = `INV-AFFD-PEND-${cIdx + 1}-${pIdx + 1}`;
      await prisma.order.upsert({
        where: { invoiceId: pendingInvoice },
        update: {
          total: monthlyTotal,
          subtotal: monthlyTotal,
          discount: 0,
          status: 'PENDING',
          paidAt: null,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          affiliateLinkId: link.id,
          packageId: pkg.id,
          domainId: domain.id,
          domainName: `pending${cIdx + 1}${pIdx + 1}.dummy.com`,
        },
        create: {
          invoiceId: pendingInvoice,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          domainName: `pending${cIdx + 1}${pIdx + 1}.dummy.com`,
          domainId: domain.id,
          packageId: pkg.id,
          affiliateLinkId: link.id,
          subtotal: monthlyTotal,
          total: monthlyTotal,
          discount: 0,
          status: 'PENDING',
        },
      });
    }

    const existingPayouts = await prisma.affiliatePayoutRequest.count({ where: { customerId: customer.id } });
    if (existingPayouts === 0) {
      await prisma.affiliatePayoutRequest.createMany({
        data: [
          {
            customerId: customer.id,
            bankAccountId: bankAccount.id,
            requestedAmount: 350000 + cIdx * 20000,
            approvedAmount: null,
            status: 'PENDING',
            customerNote: 'Mohon proses payout batch 1',
          },
          {
            customerId: customer.id,
            bankAccountId: bankAccount.id,
            requestedAmount: 250000 + cIdx * 15000,
            approvedAmount: 240000 + cIdx * 15000,
            status: 'APPROVED',
            customerNote: 'Payout batch 2',
            adminNote: 'Approved by seed',
            reviewedAt: new Date(),
          },
          {
            customerId: customer.id,
            bankAccountId: bankAccount.id,
            requestedAmount: 180000 + cIdx * 10000,
            approvedAmount: 180000 + cIdx * 10000,
            status: 'PAID',
            customerNote: 'Payout batch 3',
            adminNote: 'Paid by seed',
            reviewedAt: new Date(),
            paidAt: new Date(),
          },
        ],
      });
    }
  }

  const allActivePackages = await prisma.package.findMany({ where: { isActive: true }, select: { id: true } });
  const settingRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM affiliatesetting ORDER BY createdAt DESC LIMIT 1
  `;

  const syncedPackageIds = allActivePackages.map((item) => item.id).join(',');

  if (settingRows[0]) {
    await prisma.$executeRaw`
      UPDATE affiliatesetting
      SET commissionPercent = 10,
          minPayout = 100000,
          adminFeePercent = 2,
          rules = 'Dilarang fraud traffic. Wajib rekening atas nama sendiri. Payout diproses 1x24 jam kerja.',
          syncedPackageIds = ${syncedPackageIds},
          updatedAt = NOW(3)
      WHERE id = ${settingRows[0].id}
    `;
  } else {
    const newId = `affset_seed_${Date.now()}`;
    await prisma.$executeRaw`
      INSERT INTO affiliatesetting (
        id,
        commissionPercent,
        minPayout,
        adminFeePercent,
        rules,
        syncedPackageIds,
        createdAt,
        updatedAt
      ) VALUES (
        ${newId},
        10,
        100000,
        2,
        'Dilarang fraud traffic. Wajib rekening atas nama sendiri. Payout diproses 1x24 jam kerja.',
        ${syncedPackageIds},
        NOW(3),
        NOW(3)
      )
    `;
  }

  console.log('Affiliate dummy data completed.');
}

seedAffiliateData()
  .catch((error) => {
    console.error('Seed affiliate dummy failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
