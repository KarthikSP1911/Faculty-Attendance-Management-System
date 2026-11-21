import { createHmac, randomBytes } from 'crypto';

export const RESET_TOKEN_TTL_MINUTES = 30;
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_DAYS = 7;

export function generateToken(): string {
  return randomBytes(48).toString('hex');
}

export function hashToken(raw: string, secret: string): string {
  return createHmac('sha256', secret).update(raw).digest('hex');
}

export function resetTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000);
}

/** A token is usable only while unexpired (strictly before expiry) and not yet used. */
export function isTokenUsable(token: { expiresAt: Date; usedAt: Date | null }, now: Date): boolean {
  return token.usedAt === null && token.expiresAt.getTime() > now.getTime();
}
