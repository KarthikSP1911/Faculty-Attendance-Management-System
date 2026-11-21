export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export interface LoginState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export function isLocked(state: Pick<LoginState, 'lockedUntil'>, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

/** Returns the new login state after a failed attempt. The 5th consecutive failure locks for 15 minutes. */
export function registerFailure(state: LoginState, now: Date): LoginState {
  const lockExpired = state.lockedUntil !== null && state.lockedUntil.getTime() <= now.getTime();
  const attempts = (lockExpired ? 0 : state.failedLoginAttempts) + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return { failedLoginAttempts: attempts, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null };
}
