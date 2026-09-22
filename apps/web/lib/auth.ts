import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'arundairy_session';

export type SessionUser = {
  sub: string;
  tenantId: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
};

function getSecret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error('JWT_SECRET is required');
  }
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function readSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !payload.tenantId || !payload.email || !payload.role) return null;
    return {
      sub: payload.sub,
      tenantId: String(payload.tenantId),
      email: String(payload.email),
      role: payload.role as SessionUser['role'],
    };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  };
}
