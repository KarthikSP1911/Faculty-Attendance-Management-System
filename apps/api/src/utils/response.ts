import type { Response } from 'express';

export function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data, error: null });
}

export function fail(res: Response, status: number, code: string, message: string, details?: unknown): void {
  res.status(status).json({ success: false, data: null, error: { code, message, details: details ?? null } });
}
