import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/** Maps API field issues onto the form; returns true when at least one was applied. */
export function applyApiErrors<T extends FieldValues>(e: unknown, setError: UseFormSetError<T>): boolean {
  if (!(e instanceof ApiError) || !e.details?.length) return false;
  let applied = false;
  for (const d of e.details) {
    if (d.field) {
      setError(d.field as Path<T>, { type: 'server', message: d.message });
      applied = true;
    }
  }
  return applied;
}
