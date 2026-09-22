import { jwtVerify } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';

import { createSession, SESSION_COOKIE } from './auth';

const secret = 'test-secret-value';
const samplePayload = { sub: 'user-1', tenantId: 'tenant-1', email: 'owner@example.com', role: 'OWNER' as const };

describe('createSession', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  it('produces a JWT that verifies with the configured secret and carries the session payload', async () => {
    const token = await createSession(samplePayload);

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    expect(payload.sub).toBe(samplePayload.sub);
    expect(payload.tenantId).toBe(samplePayload.tenantId);
    expect(payload.email).toBe(samplePayload.email);
    expect(payload.role).toBe(samplePayload.role);
  });

  it('rejects verification with the wrong secret', async () => {
    const token = await createSession(samplePayload);
    await expect(jwtVerify(token, new TextEncoder().encode('a-different-secret'))).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const token = await createSession(samplePayload);
    const lastChar = token.slice(-1);
    const tampered = token.slice(0, -1) + (lastChar === 'a' ? 'b' : 'a');
    await expect(jwtVerify(tampered, new TextEncoder().encode(secret))).rejects.toThrow();
  });
});

describe('SESSION_COOKIE', () => {
  it('matches the cookie name middleware.ts checks', () => {
    expect(SESSION_COOKIE).toBe('arundairy_session');
  });
});
