import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/errors';

export const validate = (schema: ZodTypeAny) => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }
  req.body = parsed.data;
  next();
};
