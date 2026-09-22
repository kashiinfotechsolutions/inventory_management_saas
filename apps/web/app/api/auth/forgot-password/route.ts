import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

const RESET_TOKEN_TTL_MINUTES = 60;

export async function POST(request: Request) {
  const { limited } = await checkRateLimit(`forgot-password:${clientIp(request)}`, 10, 15 * 60);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();

    if (email.includes('@')) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && user.is_active) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(token, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            reset_token_hash: tokenHash,
            reset_token_expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60000),
          },
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;
        await sendEmail({
          to: email,
          subject: 'Reset your Arun Ice Cream & Dairy Products password',
          text: `We received a request to reset your password. This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
        });
      }
    }

    // Always return success, whether or not the email exists — avoids leaking which emails are registered.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
  }
}
