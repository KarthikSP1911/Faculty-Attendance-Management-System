export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;

export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}

/** 8-64 characters, at least one uppercase, lowercase, digit and special character. */
export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN) errors.push(`Password must be at least ${PASSWORD_MIN} characters`);
  if (password.length > PASSWORD_MAX) errors.push(`Password must be at most ${PASSWORD_MAX} characters`);
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a digit');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a special character');
  return { valid: errors.length === 0, errors };
}
