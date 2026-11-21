import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Config } from '../config';
import { logger } from '../logger';
import { tokenRepository } from '../repositories/tokenRepository';
import { userRepository } from '../repositories/userRepository';
import { clock } from '../utils/clock';
import { AppError } from '../utils/errors';
import { isLocked, registerFailure } from './lockout';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_DAYS,
  generateToken,
  hashToken,
  isTokenUsable,
  resetTokenExpiry,
} from './token';

const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 10;
let dummyHash: string | null = null;

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function createAuthService(cfg: Config) {
  async function issueTokens(userId: string, role: string): Promise<IssuedTokens & { refreshId: string }> {
    const accessToken = jwt.sign({ role }, cfg.jwtAccessSecret, { subject: userId, expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = generateToken();
    const refreshExpiresAt = new Date(clock.now().getTime() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    const row = await tokenRepository.createRefresh(userId, hashToken(refreshToken, cfg.jwtRefreshSecret), refreshExpiresAt);
    return { accessToken, refreshToken, refreshExpiresAt, refreshId: row.id };
  }

  async function profile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      faculty: user.faculty
        ? {
            id: user.faculty.id,
            employeeId: user.faculty.employeeId,
            fullName: user.faculty.fullName,
            departmentId: user.faculty.departmentId,
          }
        : null,
    };
  }

  return {
    async login(email: string, password: string) {
      const now = clock.now();
      const user = await userRepository.findByEmail(email);
      if (!user) {
        dummyHash ??= await bcrypt.hash('dummy-password', BCRYPT_COST);
        await bcrypt.compare(password, dummyHash); // keep timing similar for unknown emails
        throw invalidCredentials();
      }
      if (!user.isActive || user.faculty?.status === 'INACTIVE') {
        throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is deactivated');
      }
      if (isLocked(user, now)) {
        throw new AppError(429, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.', {
          lockedUntil: user.lockedUntil,
        });
      }
      if (!(await bcrypt.compare(password, user.passwordHash))) {
        await userRepository.updateLoginState(user.id, registerFailure(user, now));
        throw invalidCredentials();
      }
      await userRepository.updateLoginState(user.id, { failedLoginAttempts: 0, lockedUntil: null });
      const tokens = await issueTokens(user.id, user.role);
      return { tokens, user: await profile(user.id) };
    },

    /** Rotates the refresh token. Re-use of an already-rotated token revokes every session of that user. */
    async refresh(rawToken: string | undefined) {
      if (!rawToken) throw new AppError(401, 'UNAUTHENTICATED', 'Refresh token missing');
      const now = clock.now();
      const row = await tokenRepository.findRefresh(hashToken(rawToken, cfg.jwtRefreshSecret));
      if (!row) throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
      if (row.revokedAt) {
        await tokenRepository.revokeAllForUser(row.userId, now);
        throw new AppError(401, 'TOKEN_REUSED', 'Refresh token already used');
      }
      if (row.expiresAt.getTime() <= now.getTime()) throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token expired');
      const user = await userRepository.findById(row.userId);
      if (!user || !user.isActive) throw new AppError(401, 'UNAUTHENTICATED', 'Account unavailable');
      const tokens = await issueTokens(user.id, user.role);
      await tokenRepository.revokeRefresh(row.id, now, tokens.refreshId);
      return { tokens, user: await profile(user.id) };
    },

    async logout(rawToken: string | undefined) {
      if (!rawToken) return;
      const row = await tokenRepository.findRefresh(hashToken(rawToken, cfg.jwtRefreshSecret));
      if (row && !row.revokedAt) await tokenRepository.revokeRefresh(row.id, clock.now());
    },

    /** Returns the raw token (for tests); the controller never exposes it. The reset link is logged in dev. */
    async requestPasswordReset(email: string): Promise<string | null> {
      const user = await userRepository.findByEmail(email);
      if (!user || !user.isActive) return null;
      const now = clock.now();
      await tokenRepository.invalidateResetTokens(user.id, now);
      const raw = generateToken();
      await tokenRepository.createReset(user.id, hashToken(raw, cfg.jwtRefreshSecret), resetTokenExpiry(now));
      if (cfg.nodeEnv !== 'production') {
        logger.info(`Password reset link for ${email}: ${cfg.clientUrl}/reset-password?token=${raw}`);
      }
      return raw;
    },

    async resetPassword(rawToken: string, newPassword: string) {
      const now = clock.now();
      const row = await tokenRepository.findReset(hashToken(rawToken, cfg.jwtRefreshSecret));
      if (!row || !isTokenUsable(row, now) || !(await tokenRepository.consumeReset(row.id, now))) {
        throw new AppError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Reset token is invalid or has expired');
      }
      await userRepository.updatePassword(row.userId, await bcrypt.hash(newPassword, BCRYPT_COST));
      await tokenRepository.revokeAllForUser(row.userId, now);
    },

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new AppError(422, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }
      if (currentPassword === newPassword) {
        throw new AppError(422, 'PASSWORD_REUSE', 'New password must differ from the current password');
      }
      await userRepository.updatePassword(userId, await bcrypt.hash(newPassword, BCRYPT_COST));
      await tokenRepository.revokeAllForUser(userId, clock.now());
      return { tokens: await issueTokens(user.id, user.role) };
    },

    profile,
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
