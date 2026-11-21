import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/errors';

/**
 * Validates req.body (default) or req.query. Parsed query values are placed in res.locals.query
 * because req.query is read-only in Express 5.
 */
export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(source === 'body' ? req.body : req.query);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
    }
    if (source === 'body') req.body = parsed.data;
    else res.locals.query = parsed.data;
    next();
  };
