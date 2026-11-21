import type { CookieOptions, Response } from 'express';
import { Router } from 'express';
import type { Config } from '../config';
import { ACCESS_COOKIE, REFRESH_COOKIE, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import type { AuthService, IssuedTokens } from '../services/authService';
import { ok } from '../utils/response';
import { changePasswordSchema, forgotSchema, loginSchema, resetSchema } from '../validators/auth';

export function authRoutes(cfg: Config, auth: AuthService): Router {
  const router = Router();
  const secure = cfg.nodeEnv === 'production';
  const base: CookieOptions = { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax' };

  const setCookies = (res: Response, t: IssuedTokens) => {
    res.cookie(ACCESS_COOKIE, t.accessToken, { ...base, path: '/', maxAge: 15 * 60_000 });
    res.cookie(REFRESH_COOKIE, t.refreshToken, { ...base, path: '/api/v1/auth', expires: t.refreshExpiresAt });
  };
  const clearCookies = (res: Response) => {
    res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/v1/auth' });
  };

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { tokens, user } = await auth.login(req.body.email, req.body.password);
    setCookies(res, tokens);
    ok(res, { user });
  });

  router.post('/refresh', async (req, res) => {
    const { tokens, user } = await auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    setCookies(res, tokens);
    ok(res, { user });
  });

  router.post('/logout', async (req, res) => {
    await auth.logout(req.cookies?.[REFRESH_COOKIE]);
    clearCookies(res);
    res.status(204).end();
  });

  router.post('/forgot-password', validate(forgotSchema), async (req, res) => {
    await auth.requestPasswordReset(req.body.email);
    ok(res, { message: 'If that email is registered, a reset link has been sent.' });
  });

  router.post('/reset-password', validate(resetSchema), async (req, res) => {
    await auth.resetPassword(req.body.token, req.body.newPassword);
    ok(res, { message: 'Password updated. Please log in.' });
  });

  router.post('/change-password', authenticate(cfg), validate(changePasswordSchema), async (req, res) => {
    const { tokens } = await auth.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    setCookies(res, tokens);
    ok(res, { message: 'Password changed.' });
  });

  router.get('/me', authenticate(cfg), async (req, res) => {
    ok(res, { user: await auth.profile(req.user!.id) });
  });

  return router;
}
