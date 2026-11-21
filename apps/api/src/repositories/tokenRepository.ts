import { prisma } from '../db';

export const tokenRepository = {
  createRefresh: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } }),
  findRefresh: (tokenHash: string) => prisma.refreshToken.findUnique({ where: { tokenHash } }),
  revokeRefresh: (id: string, now: Date, replacedBy?: string) =>
    prisma.refreshToken.update({ where: { id }, data: { revokedAt: now, replacedBy } }),
  revokeAllForUser: (userId: string, now: Date) =>
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),

  invalidateResetTokens: (userId: string, now: Date) =>
    prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } }),
  createReset: (userId: string, tokenHash: string, expiresAt: Date) =>
    prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
  findReset: (tokenHash: string) => prisma.passwordResetToken.findUnique({ where: { tokenHash } }),
  /** Atomically marks a reset token as used; returns false if it was already used. */
  consumeReset: async (id: string, now: Date) =>
    (await prisma.passwordResetToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: now } })).count ===
    1,
};
