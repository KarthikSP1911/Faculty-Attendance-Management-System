import { z } from 'zod';

export const emailField = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');

/** Mirrors the API password policy (8-64 chars, upper, lower, digit, special). */
export const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .max(64, 'At most 64 characters')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[0-9]/, 'Include a digit')
  .regex(/[^A-Za-z0-9]/, 'Include a special character');

export const loginSchema = z.object({ email: emailField, password: z.string().min(1, 'Password is required') });

export const forgotSchema = z.object({ email: emailField });

export const resetSchema = z
  .object({ newPassword: passwordField, confirm: z.string().min(1, 'Confirm your password') })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: passwordField, confirm: z.string().min(1, 'Confirm your password') })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');

export const leaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, 'Choose a leave type'),
    startDate: dateStr,
    endDate: dateStr,
    halfDay: z.enum(['NONE', 'FIRST_HALF', 'SECOND_HALF']),
    reason: z.string().trim().min(10, 'Reason must be 10-300 characters').max(300, 'Reason must be 10-300 characters'),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: 'End date cannot be before the start date' })
  .refine((v) => v.halfDay === 'NONE' || v.startDate === v.endDate, { path: ['halfDay'], message: 'Half day needs a single date' });

const time = z.string().regex(/^$|^\d{2}:\d{2}$/, 'Use HH:MM');
export const regularizationSchema = z
  .object({ date: dateStr, requestedCheckIn: time, requestedCheckOut: time, reason: z.string().trim().min(10, 'Reason must be 10-300 characters').max(300, 'Reason must be 10-300 characters') })
  .refine((v) => v.requestedCheckIn || v.requestedCheckOut, { path: ['requestedCheckIn'], message: 'Give a check-in or a check-out time' });

export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(50, 'At most 50 characters'),
  code: z.string().regex(/^[A-Z]{2,6}$/, '2-6 uppercase letters'),
});

export const facultySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'At least 2 characters')
    .max(60, 'At most 60 characters')
    .regex(/^[A-Za-z .]+$/, 'Letters, spaces and dots only'),
  email: emailField,
  phone: z.string().regex(/^[6-9]\d{9}$/, '10 digits starting with 6-9'),
  departmentId: z.string().min(1, 'Choose a department'),
  designation: z.enum(['ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR', 'LECTURER']),
  dateOfJoining: dateStr,
  shiftId: z.string().optional(),
});

export const holidaySchema = z.object({
  date: dateStr,
  name: z.string().trim().min(2, 'At least 2 characters').max(80),
  type: z.enum(['NATIONAL', 'INSTITUTIONAL', 'OPTIONAL']),
});

export const shiftSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(40),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  workingDays: z.array(z.number()).min(1, 'Choose at least one working day'),
});

export const graceSchema = z.object({
  graceMinutes: z.number({ error: 'Enter a number' }).int('Whole minutes only').min(0, 'At least 0').max(60, 'At most 60'),
});
