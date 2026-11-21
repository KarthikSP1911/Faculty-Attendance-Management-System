'use client';

import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/shell';

export default function Layout({ children }: { children: ReactNode }) {
  return <RoleGuard role="FACULTY">{children}</RoleGuard>;
}
