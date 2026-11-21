import { isValidDateString, todayIST } from '../../src/utils/dates';
import { isValidGrace, isValidTime, toMinutes, validateShift } from '../../src/services/shiftRules';
import { resetClock, freezeClock } from '../../src/utils/clock';
import {
  departmentSchema,
  facultyCreateSchema,
  facultyQuerySchema,
  fullName,
  holidaySchema,
  phone,
  rulesSchema,
} from '../../src/validators/resources';

afterEach(resetClock);

describe('full name (EP/BVA, REQ-FAC-01)', () => {
  it.each([
    ['A', false],
    ['Ab', true],
    ['Dr. A. Kumar', true],
    ['A'.repeat(60), true],
    ['A'.repeat(61), false],
    ['Asha 2', false],
    ['Asha-Rao', false],
  ])('%s -> %s', (value, valid) => expect(fullName.safeParse(value).success).toBe(valid));
});

describe('phone (EP)', () => {
  it.each([
    ['9876543210', true],
    ['6000000000', true],
    ['5876543210', false],
    ['987654321', false],
    ['98765432100', false],
    ['98765abcde', false],
  ])('%s -> %s', (value, valid) => expect(phone.safeParse(value).success).toBe(valid));
});

describe('department schema (REQ-DEPT-01)', () => {
  it.each([
    [{ name: 'AB', code: 'CS' }, true],
    [{ name: 'A', code: 'CS' }, false],
    [{ name: 'N'.repeat(50), code: 'ABCDEF' }, true],
    [{ name: 'N'.repeat(51), code: 'CS' }, false],
    [{ name: 'Valid', code: 'C' }, false],
    [{ name: 'Valid', code: 'ABCDEFG' }, false],
    [{ name: 'Valid', code: 'cse' }, false],
    [{ name: 'Valid', code: 'CS1' }, false],
  ])('%j -> %s', (value, valid) => expect(departmentSchema.safeParse(value).success).toBe(valid));
});

describe('grace period (REQ-RULE-01)', () => {
  it.each([
    [-1, false],
    [0, true],
    [15, true],
    [60, true],
    [61, false],
    [10.5, false],
  ])('%s -> %s', (n, valid) => {
    expect(isValidGrace(n)).toBe(valid);
    expect(rulesSchema.safeParse({ graceMinutes: n }).success).toBe(valid);
  });
});

describe('date of joining must not be in the future', () => {
  const base = { fullName: 'Asha Rao', email: 'a@x.test', phone: '9876543210', departmentId: 'd', designation: 'LECTURER' as const };
  it('allows today and rejects tomorrow, using Asia/Kolkata calendar day', () => {
    freezeClock('2026-03-02T20:00:00Z'); // 01:30 IST on 3 March
    expect(todayIST(new Date('2026-03-02T20:00:00Z'))).toBe('2026-03-03');
    expect(facultyCreateSchema.safeParse({ ...base, dateOfJoining: '2026-03-03' }).success).toBe(true);
    expect(facultyCreateSchema.safeParse({ ...base, dateOfJoining: '2026-03-04' }).success).toBe(false);
  });
  it('validates calendar dates', () => {
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(isValidDateString('2026-02-29')).toBe(false);
    expect(isValidDateString('2026-2-9')).toBe(false);
    expect(isValidDateString('not-a-date')).toBe(false);
  });
});

describe('shift rules', () => {
  const ok = { startTime: '09:00', endTime: '17:00', workingDays: [1, 2, 3, 4, 5, 6] };
  it('accepts the default shift', () => expect(validateShift(ok)).toBeNull());
  it.each([
    [{ ...ok, startTime: '9:00' }, 'HH:mm'],
    [{ ...ok, endTime: '24:00' }, 'HH:mm'],
    [{ ...ok, endTime: '09:00' }, 'after start'],
    [{ ...ok, endTime: '08:59' }, 'after start'],
    [{ ...ok, workingDays: [] }, 'At least one'],
    [{ ...ok, workingDays: [0, 1] }, 'Sunday'],
    [{ ...ok, workingDays: [7] }, 'Sunday'],
    [{ ...ok, workingDays: [1, 1] }, 'unique'],
  ])('rejects %j', (shift, message) => expect(validateShift(shift)).toContain(message));
  it('helpers', () => {
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('7:00')).toBe(false);
    expect(toMinutes('09:15')).toBe(555);
  });
});

describe('query and holiday schemas', () => {
  it('applies defaults and limits page size to 10/25/50', () => {
    expect(facultyQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 10, sortBy: 'employeeId', order: 'asc' });
    expect(facultyQuerySchema.safeParse({ pageSize: '25' }).success).toBe(true);
    expect(facultyQuerySchema.safeParse({ pageSize: '20' }).success).toBe(false);
    expect(facultyQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
  it('validates holidays', () => {
    expect(holidaySchema.safeParse({ date: '2026-12-25', name: 'Christmas', type: 'NATIONAL' }).success).toBe(true);
    expect(holidaySchema.safeParse({ date: '2026-13-25', name: 'Christmas', type: 'NATIONAL' }).success).toBe(false);
    expect(holidaySchema.safeParse({ date: '2026-12-25', name: 'X', type: 'NATIONAL' }).success).toBe(false);
    expect(holidaySchema.safeParse({ date: '2026-12-25', name: 'Christmas', type: 'OTHER' }).success).toBe(false);
  });
});
