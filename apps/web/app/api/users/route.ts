import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const users = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.user.findMany({
        where: { tenant_id: session.tenantId },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
          last_login_at: true,
        },
      });
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load team members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const role = String(body.role ?? 'CASHIER');

    if (!name || !email.includes('@') || password.length < 8) {
      return NextResponse.json({ error: 'Name, valid email and password (8+ chars) are required' }, { status: 400 });
    }

    if (!['OWNER', 'MANAGER', 'CASHIER'].includes(role)) {
      return NextResponse.json({ error: 'Role must be OWNER, MANAGER or CASHIER' }, { status: 400 });
    }

    if (session.role !== 'OWNER' && role === 'OWNER') {
      return NextResponse.json({ error: 'Only the owner can create an owner account' }, { status: 403 });
    }

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

      const exists = await tx.user.findUnique({ where: { email } });
      if (exists) {
        throw new Error('USER_EXISTS');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      return tx.user.create({
        data: {
          tenant_id: session.tenantId,
          name,
          email,
          password_hash: passwordHash,
          role: role as 'OWNER' | 'MANAGER' | 'CASHIER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
        },
      });
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_EXISTS') {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Unable to create team member' }, { status: 500 });
  }
}
