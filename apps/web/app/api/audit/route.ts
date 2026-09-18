import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const logs = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.auditLog.findMany({
        where: { tenant_id: session.tenantId },
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    });

    return NextResponse.json({
      logs: logs.map((log: {
        id: string;
        action: string;
        entity_type: string;
        entity_id: string | null;
        metadata: unknown;
        created_at: Date;
        user: { id: string; name: string; email: string; role: string } | null;
      }) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        metadata: log.metadata,
        created_at: log.created_at,
        user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email, role: log.user.role } : null,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load audit trail' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'CASHIER') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  try {
    const body = await request.json();
    const action = String(body.action ?? '').trim();
    const entityType = String(body.entityType ?? '').trim();
    const entityId = body.entityId ? String(body.entityId).trim() : null;
    const metadata = body.metadata ?? {};

    if (!action || !entityType) {
      return NextResponse.json({ error: 'Action and entity type are required' }, { status: 400 });
    }

    const log = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.auditLog.create({
        data: {
          tenant_id: session.tenantId,
          user_id: session.sub,
          action,
          entity_type: entityType,
          entity_id: entityId,
          metadata,
        },
      });
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to create audit log' }, { status: 500 });
  }
}
