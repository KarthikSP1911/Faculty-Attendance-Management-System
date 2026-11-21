import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import type { Config } from '../config';
import { userRepository } from '../repositories/userRepository';
import '../types/express-augment';
import { AppError } from '../utils/errors';

export const ACCESS_COOKIE = 'fams_access';
export const REFRESH_COOKIE = 'fams_refresh';

export function authenticate(cfg: Config) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    const token = req.cookies?.[ACCESS_COOKIE] ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    let userId: string;
    try {
      const payload = jwt.verify(token, cfg.jwtAccessSecret);
      userId = String((payload as jwt.JwtPayload).sub);
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired access token');
    }
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    if (!user.isActive || user.faculty?.status === 'INACTIVE') {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is deactivated');
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      facultyId: user.faculty?.id ?? null,
      departmentId: user.faculty?.departmentId ?? null,
    };
    next();
  };
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    if (!roles.includes(req.user.role)) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resource');
    next();
  };
