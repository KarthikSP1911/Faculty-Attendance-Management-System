import { z } from 'zod';
import { validatePassword } from '../services/passwordPolicy';

const email = z.string().trim().toLowerCase().email('Invalid email address');

const newPassword = z.string().superRefine((value, ctx) => {
  for (const message of validatePassword(value).errors) ctx.addIssue({ code: 'custom', message });
});

export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required') });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(1, 'Token is required'), newPassword });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword,
});
