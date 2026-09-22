import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { readSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const batch = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${session.tenantId}, true)`;
      return tx.uploadBatch.findFirst({ where: { id: params.id, tenant_id: session.tenantId } });
    });

    if (!batch) return NextResponse.json({ error: 'Upload batch not found' }, { status: 404 });
    return NextResponse.json({ batch });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to load upload batch' }, { status: 500 });
  }
}
