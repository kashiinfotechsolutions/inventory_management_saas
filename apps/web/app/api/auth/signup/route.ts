import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

import { createSession, sessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const tenantName = String(body.tenantName ?? '').trim();
    const tenantSlug = String(body.tenantSlug ?? '').trim().toLowerCase();

    if (!name || !tenantName || !tenantSlug || !email.includes('@') || password.length < 8) {
      return NextResponse.json({ error: 'Valid name, email, password, tenant name and slug are required' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const tenantId = randomUUID();
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) throw new Error('USER_EXISTS');

      const existingTenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
      if (existingTenant) throw new Error('TENANT_EXISTS');

      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await tx.tenant.create({ data: { id: tenantId, name: tenantName, slug: tenantSlug } });
      return tx.user.create({
        data: { tenant_id: tenantId, name, email, password_hash: passwordHash, role: 'OWNER' },
      });
    });

    const token = await createSession({ sub: user.id, tenantId: user.tenant_id, email: user.email, role: user.role });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_EXISTS') return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    if (error instanceof Error && error.message === 'TENANT_EXISTS') return NextResponse.json({ error: 'Tenant slug is already registered' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 });
  }
}
