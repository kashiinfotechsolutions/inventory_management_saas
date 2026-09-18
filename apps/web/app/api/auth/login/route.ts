import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { createSession, sessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });

    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createSession({ sub: user.id, tenantId: user.tenant_id, email: user.email, role: user.role });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant: user.tenant.name } });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to sign in' }, { status: 500 });
  }
}
