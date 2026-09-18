import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Starter',
    price_monthly: '499.00',
    price_yearly: '4990.00',
    limits: { products: 500, users: 3, monthlyBills: 1000 },
  },
  {
    name: 'Growth',
    price_monthly: '1499.00',
    price_yearly: '14990.00',
    limits: { products: 5000, users: 10, monthlyBills: 10000 },
  },
  {
    name: 'Scale',
    price_monthly: '3999.00',
    price_yearly: '39990.00',
    limits: { products: 25000, users: 50, monthlyBills: 100000 },
  },
];

async function main() {
  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({
      where: { name: plan.name },
    });

    if (existing) {
      await prisma.plan.update({
        where: { id: existing.id },
        data: plan,
      });
    } else {
      await prisma.plan.create({ data: plan });
    }
  }

  const starterPlan = await prisma.plan.findFirst({
    where: { name: 'Starter' },
  });

  if (!starterPlan) {
    throw new Error('Starter plan was not created');
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-store' },
    update: {
      name: 'Demo Store',
      plan_id: starterPlan.id,
    },
    create: {
      name: 'Demo Store',
      slug: 'demo-store',
      plan_id: starterPlan.id,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  const passwordHash = await bcrypt.hash('Demo@12345', 12);
  await prisma.user.upsert({
    where: { email: 'owner@demo.scoopstock.local' },
    update: {
      tenant_id: tenant.id,
      name: 'Demo Owner',
      password_hash: passwordHash,
      role: 'OWNER',
      is_active: true,
    },
    create: {
      tenant_id: tenant.id,
      email: 'owner@demo.scoopstock.local',
      name: 'Demo Owner',
      password_hash: passwordHash,
      role: 'OWNER',
    },
  });

  await prisma.billCounter.upsert({
    where: { tenant_id: tenant.id },
    update: {},
    create: { tenant_id: tenant.id },
  });

  const products = [
    { sku: 'DEMO-COFFEE', name: 'House Coffee', category: 'Beverages', mrp: 180, price: 150, quantity_in_stock: 40 },
    { sku: 'DEMO-CROISSANT', name: 'Butter Croissant', category: 'Bakery', mrp: 140, price: 120, quantity_in_stock: 18 },
    { sku: 'DEMO-SANDWICH', name: 'Grilled Sandwich', category: 'Food', mrp: 260, price: 220, quantity_in_stock: 12 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { tenant_id_sku: { tenant_id: tenant.id, sku: product.sku } },
      update: product,
      create: { ...product, tenant_id: tenant.id },
    });
  }

}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });