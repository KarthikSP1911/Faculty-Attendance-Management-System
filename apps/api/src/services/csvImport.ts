import type { Designation } from '@prisma/client';
import { z } from 'zod';
import { isValidDateString } from '../utils/dates';

export const CSV_COLUMNS = ['fullName', 'email', 'phone', 'departmentCode', 'designation', 'dateOfJoining'] as const;
export const MAX_IMPORT_ROWS = 500;

const DESIGNATIONS: Designation[] = ['ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR', 'LECTURER'];

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF or LF. Blank lines are skipped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') endField();
    else if (ch === '\n') endRow();
    else if (ch !== '\r') field += ch;
  }
  endRow();
  return rows;
}

export function normalizeDesignation(value: string): Designation | undefined {
  const key = value.trim().toUpperCase().replace(/\s+/g, '_') as Designation;
  return DESIGNATIONS.includes(key) ? key : undefined;
}

/** Returns missing required column names (case-insensitive header match). */
export function missingColumns(header: string[]): string[] {
  const present = new Set(header.map((h) => h.trim().toLowerCase()));
  return CSV_COLUMNS.filter((c) => !present.has(c.toLowerCase()));
}

export function toRecords(rows: string[][]): Record<string, string>[] {
  const [header, ...data] = rows;
  const keys = header.map((h) => CSV_COLUMNS.find((c) => c.toLowerCase() === h.trim().toLowerCase()) ?? h.trim());
  return data.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()])));
}

export interface CsvContext {
  departmentCodes: Set<string>;
  existingEmails: Set<string>;
  today: string;
}
export interface ImportRow {
  fullName: string;
  email: string;
  phone: string;
  departmentCode: string;
  designation: Designation;
  dateOfJoining: string;
}

const rowSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters')
    .regex(/^[A-Za-z .]+$/, 'Name may contain only letters, spaces and dots'),
  email: z.string().toLowerCase().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Phone must be 10 digits starting with 6-9'),
  departmentCode: z.string().min(1, 'Department code is required'),
  designation: z.string(),
  dateOfJoining: z.string(),
});

/** Row-level validation. `row` is the 1-based line number in the file (header is line 1). */
export function validateCsvRows(records: Record<string, string>[], ctx: CsvContext) {
  const valid: { row: number; data: ImportRow }[] = [];
  const errors: { row: number; messages: string[] }[] = [];
  const seen = new Set<string>();

  records.forEach((record, idx) => {
    const row = idx + 2;
    const messages: string[] = [];
    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) messages.push(...parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    const data = parsed.success ? parsed.data : undefined;

    const designation = normalizeDesignation(record.designation ?? '');
    if (!designation) messages.push('designation: must be one of Assistant Professor, Associate Professor, Professor, Lecturer');
    if (!isValidDateString(record.dateOfJoining ?? '')) messages.push('dateOfJoining: must be a valid date (YYYY-MM-DD)');
    else if (record.dateOfJoining > ctx.today) messages.push('dateOfJoining: cannot be in the future');
    const code = record.departmentCode ?? '';
    if (code && !ctx.departmentCodes.has(code)) messages.push(`departmentCode: unknown department ${code}`);
    if (data) {
      if (ctx.existingEmails.has(data.email)) messages.push('email: already registered');
      else if (seen.has(data.email)) messages.push('email: duplicated in this file');
      seen.add(data.email);
    }

    if (messages.length > 0 || !data || !designation) errors.push({ row, messages });
    else valid.push({ row, data: { ...data, designation, dateOfJoining: record.dateOfJoining } });
  });
  return { valid, errors };
}
