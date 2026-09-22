import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const { limited } = await checkRateLimit(`reset-password:${clientIp(request)}`, 10, 15 * 60);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const token = String(body.token ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!email || !token || newPassword.length < 8) {
      return NextResponse.json({ error: 'Email, token and a password (8+ chars) are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.reset_token_hash || !user.reset_token_expires_at) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    if (user.reset_token_expires_at.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const tokenMatches = await bcrypt.compare(token, user.reset_token_hash);
    if (!tokenMatches) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        reset_token_hash: null,
        reset_token_expires_at: null,
        failed_login_count: 0,
        locked_until: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to reset password' }, { status: 500 });
  }
}
