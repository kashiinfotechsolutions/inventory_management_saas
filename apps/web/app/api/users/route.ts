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

export async function PATCH(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'User id is required' }, { status: 400 });

    const data: { role?: 'OWNER' | 'MANAGER' | 'CASHIER'; is_active?: boolean } = {};

    if (body.role !== undefined) {
      const role = String(body.role);
      if (!['OWNER', 'MANAGER', 'CASHIER'].includes(role)) {
        return NextResponse.json({ error: 'Role must be OWNER, MANAGER or CASHIER' }, { status: 400 });
      }
      if (session.role !== 'OWNER' && role === 'OWNER') {
        return NextResponse.json({ error: 'Only the owner can grant owner access' }, { status: 403 });
      }
      data.role = role as 'OWNER' | 'MANAGER' | 'CASHIER';
    }

    if (body.is_active !== undefined) {
      if (id === session.sub && body.is_active === false) {
        return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
      }
      data.is_active = Boolean(body.is_active);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

      const existing = await tx.user.findFirst({ where: { id, tenant_id: session.tenantId } });
      if (!existing) throw new Error('NOT_FOUND');
      if (existing.role === 'OWNER' && session.role !== 'OWNER' && (data.role || data.is_active === false)) {
        throw new Error('FORBIDDEN');
      }

      return tx.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true, last_login_at: true },
      });
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to update team member' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  if (id === session.sub) return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });

  try {
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;

      const existing = await tx.user.findFirst({ where: { id, tenant_id: session.tenantId } });
      if (!existing) throw new Error('NOT_FOUND');
      if (existing.role === 'OWNER' && session.role !== 'OWNER') throw new Error('FORBIDDEN');

      // Soft-deactivate rather than a hard delete: StockMovement/Bill/UploadBatch
      // reference created_by as a plain uuid with no FK, so a hard delete would
      // silently orphan that history. Deactivating also blocks login immediately.
      return tx.user.update({
        where: { id },
        data: { is_active: false },
        select: { id: true, name: true, email: true, role: true, is_active: true },
      });
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'FORBIDDEN') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to deactivate team member' }, { status: 500 });
  }
}
