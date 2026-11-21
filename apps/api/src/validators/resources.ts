import { z } from 'zod';
import { clock } from '../utils/clock';
import { isValidDateString, todayIST } from '../utils/dates';
import { validatePassword } from '../services/passwordPolicy';
import { GRACE_MAX, GRACE_MIN, validateShift } from '../services/shiftRules';

// ---------- departments ----------
export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  code: z.string().regex(/^[A-Z]{2,6}$/, 'Code must be 2-6 uppercase letters'),
});
export const hodSchema = z.object({ facultyId: z.string().min(1).nullable() });

// ---------- faculty ----------
export const fullName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters')
  .regex(/^[A-Za-z .]+$/, 'Name may contain only letters, spaces and dots');
export const phone = z.string().regex(/^[6-9]\d{9}$/, 'Phone must be 10 digits starting with 6-9');
export const email = z.string().trim().toLowerCase().email('Invalid email address');
export const designation = z.enum(['ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR', 'LECTURER']);
export const joiningDate = z
  .string()
  .refine(isValidDateString, 'Date must be a valid YYYY-MM-DD date')
  .refine((s) => !isValidDateString(s) || s <= todayIST(clock.now()), 'Date of joining cannot be in the future');
const id = z.string().min(1);

export const facultyCreateSchema = z.object({
  fullName,
  email,
  phone,
  departmentId: id,
  designation,
  dateOfJoining: joiningDate,
  shiftId: id.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  password: z
    .string()
    .superRefine((v, ctx) => {
      for (const message of validatePassword(v).errors) ctx.addIssue({ code: 'custom', message });
    })
    .optional(),
});

export const facultyUpdateSchema = z
  .object({ fullName, email, phone, departmentId: id, designation, dateOfJoining: joiningDate, shiftId: id })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'At least one field is required');

export const statusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });
export const importSchema = z.object({ csv: z.string().min(1, 'CSV content is required') });

export const facultyQuerySchema = z.object({
  q: z.string().trim().optional(),
  departmentId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortBy: z.enum(['fullName', 'employeeId', 'dateOfJoining', 'createdAt']).default('employeeId'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .refine((n) => [10, 25, 50].includes(n), 'pageSize must be 10, 25 or 50')
    .default(10),
});
export type FacultyQuery = z.infer<typeof facultyQuerySchema>;

// ---------- shifts and rules ----------
export const shiftSchema = z
  .object({
    name: z.string().trim().min(2).max(40),
    startTime: z.string(),
    endTime: z.string(),
    workingDays: z.array(z.number()),
  })
  .superRefine((s, ctx) => {
    const message = validateShift(s);
    if (message) ctx.addIssue({ code: 'custom', message });
  });

export const rulesSchema = z.object({
  graceMinutes: z
    .number()
    .int('Grace period must be a whole number')
    .min(GRACE_MIN, `Grace period must be at least ${GRACE_MIN}`)
    .max(GRACE_MAX, `Grace period must be at most ${GRACE_MAX}`),
});

// ---------- holidays ----------
export const holidaySchema = z.object({
  date: z.string().refine(isValidDateString, 'Date must be a valid YYYY-MM-DD date'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  type: z.enum(['NATIONAL', 'INSTITUTIONAL', 'OPTIONAL']),
});
export const holidayQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
