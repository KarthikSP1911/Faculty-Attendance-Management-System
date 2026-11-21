import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { loadConfig, type Config } from './config';
import { logger } from './logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { attendanceRoutes } from './routes/attendance';
import { authRoutes } from './routes/auth';
import { leaveRoutes, regularizationRoutes } from './routes/leave';
import { departmentRoutes, facultyRoutes, holidayRoutes, ruleRoutes, shiftRoutes } from './routes/resources';
import { createAuthService } from './services/authService';
import { fail, ok } from './utils/response';

export interface AppOptions {
  config?: Config;
  /** Requests per minute per IP on /auth/*. Defaults to 10. */
  authRateLimit?: number;
}

export function createApp(options: AppOptions = {}) {
  const cfg = options.config ?? loadConfig();
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (_req, res) => String(res.getHeader('x-request-id')) }));
  app.use(helmet());
  app.use(cors({ origin: [cfg.clientUrl], credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.get('/health', (_req, res) => ok(res, { status: 'ok' }));

  api.use(
    '/auth',
    rateLimit({
      windowMs: 60_000,
      limit: options.authRateLimit ?? 10,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => fail(res, 429, 'RATE_LIMITED', 'Too many requests. Please slow down.'),
    }),
    authRoutes(cfg, createAuthService(cfg)),
  );

  api.use('/departments', departmentRoutes(cfg));
  api.use('/faculty', facultyRoutes(cfg));
  api.use('/shifts', shiftRoutes(cfg));
  api.use('/rules', ruleRoutes(cfg));
  api.use('/holidays', holidayRoutes(cfg));
  api.use('/attendance', attendanceRoutes(cfg));
  api.use('/leave', leaveRoutes(cfg));
  api.use('/regularization', regularizationRoutes(cfg));

  app.use('/api/v1', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
