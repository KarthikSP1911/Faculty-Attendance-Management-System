import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';
import { AppError } from '../utils/errors';
import { fail } from '../utils/response';

export function notFound(_req: Request, res: Response): void {
  fail(res, 404, 'NOT_FOUND', 'Route not found');
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }
  if (err instanceof SyntaxError && (err as { status?: number }).status === 400) {
    fail(res, 400, 'INVALID_JSON', 'Malformed JSON body');
    return;
  }
  logger.error({ err, requestId: res.getHeader('x-request-id'), path: req.path }, 'unhandled error');
  fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}
