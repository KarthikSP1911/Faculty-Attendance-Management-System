import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  facultyId: string | null;
  departmentId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
