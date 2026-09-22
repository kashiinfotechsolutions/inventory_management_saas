import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { createSession, sessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: Request) {
  const { limited } = await checkRateLimit(`login:${clientIp(request)}`, 10, 15 * 60);
  if (limited) {
    return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.locked_until && user.locked_until.getTime() > Date.now()) {
      const retryMinutes = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000);
      return NextResponse.json({ error: `Account temporarily locked. Try again in ${retryMinutes} minute(s).` }, { status: 423 });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      const failedCount = user.failed_login_count + 1;
      const shouldLock = failedCount >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_count: shouldLock ? 0 : failedCount,
          locked_until: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null,
        },
      });
      if (shouldLock) {
        return NextResponse.json({ error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` }, { status: 423 });
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failed_login_count: 0, locked_until: null, last_login_at: new Date() },
    });

    const token = await createSession({ sub: user.id, tenantId: user.tenant_id, email: user.email, role: user.role });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant: user.tenant.name } });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to sign in' }, { status: 500 });
  }
}
