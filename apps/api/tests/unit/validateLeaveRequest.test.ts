import { canTransitionLeave, countWorkingDays, validateLeaveRequest, addDays, type LeaveContext, type LeaveInput } from '../../src/services/leaveRules';

const TODAY = '2026-03-02'; // Monday
const ctx: LeaveContext = { workingDays: [1, 2, 3, 4, 5, 6], holidays: new Set(), balanceRemaining: 12, overlaps: false };
const req = (over: Partial<LeaveInput> = {}): LeaveInput => ({
  startDate: '2026-03-09',
  endDate: '2026-03-09',
  halfDay: 'NONE',
  reason: 'Family function out of town',
  today: TODAY,
  ...over,
});
const run = (over: Partial<LeaveInput> = {}, c: Partial<LeaveContext> = {}) => validateLeaveRequest(req(over), { ...ctx, ...c });
const fields = (r: ReturnType<typeof run>) => r.issues.map((i) => i.field);

describe('working-day counting', () => {
  it('skips Sundays and holidays', () => {
    expect(countWorkingDays('2026-03-02', '2026-03-08', [1, 2, 3, 4, 5, 6], new Set())).toBe(6);
    expect(countWorkingDays('2026-03-02', '2026-03-08', [1, 2, 3, 4, 5, 6], new Set(['2026-03-04']))).toBe(5);
    expect(countWorkingDays('2026-03-02', '2026-03-08', [1, 2, 3, 4, 5], new Set())).toBe(5);
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('length boundaries (REQ-LEAVE-02)', () => {
  it('accepts 1 working day', () => expect(run()).toEqual({ days: 1, issues: [] }));
  it('accepts exactly 15 working days', () => {
    // Mon 9 Mar to Tue 31 Mar with Sundays off = 15 days on 9..24 March (9-14, 16-21, 23-25)
    const r = run({ startDate: '2026-03-09', endDate: '2026-03-25' }, { balanceRemaining: 20 });
    expect(r.days).toBe(15);
    expect(r.issues).toEqual([]);
  });
  it('rejects 16 working days', () => {
    const r = run({ startDate: '2026-03-09', endDate: '2026-03-26' }, { balanceRemaining: 20 });
    expect(r.days).toBe(16);
    expect(fields(r)).toEqual(['endDate']);
  });
  it('rejects a range with no working days', () => {
    expect(fields(run({ startDate: '2026-03-08', endDate: '2026-03-08' }))).toEqual(['startDate']);
    expect(fields(run({}, { holidays: new Set(['2026-03-09']) }))).toEqual(['startDate']);
  });
});

describe('date window and format', () => {
  it('allows a start 30 days back but not 31', () => {
    expect(run({ startDate: '2026-01-31', endDate: '2026-01-31' }).issues).toEqual([]);
    expect(fields(run({ startDate: '2026-01-30', endDate: '2026-01-30' }))).toEqual(['startDate']);
  });
  it('allows a start 365 days ahead but not 366', () => {
    expect(run({ startDate: '2027-03-02', endDate: '2027-03-02' }).issues).toEqual([]);
    expect(fields(run({ startDate: '2027-03-03', endDate: '2027-03-03' }))).toEqual(['startDate']);
  });
  it('rejects end before start, bad dates and cross-year ranges', () => {
    expect(fields(run({ startDate: '2026-03-10', endDate: '2026-03-09' }))).toEqual(['endDate']);
    expect(fields(run({ startDate: '2026-02-30' }))).toEqual(['startDate']);
    expect(fields(run({ endDate: 'soon' }))).toEqual(['endDate']);
    expect(fields(run({ startDate: '2026-12-30', endDate: '2027-01-02' }, { balanceRemaining: 20 }))).toContain('endDate');
  });
});

describe('reason length', () => {
  it.each([
    ['too short', 'x'.repeat(9), false],
    ['minimum', 'x'.repeat(10), true],
    ['maximum', 'x'.repeat(300), true],
    ['too long', 'x'.repeat(301), false],
    ['padding is trimmed', `   ${'x'.repeat(9)}   `, false],
  ])('%s', (_n, reason, valid) => {
    expect(run({ reason }).issues.length === 0).toBe(valid);
  });
});

describe('half day (REQ-LEAVE-03)', () => {
  it('counts 0.5 for a single day', () => {
    expect(run({ halfDay: 'FIRST_HALF' }).days).toBe(0.5);
    expect(run({ halfDay: 'SECOND_HALF' }).days).toBe(0.5);
  });
  it('rejects a multi-day half-day leave and a non-working day', () => {
    expect(fields(run({ halfDay: 'FIRST_HALF', endDate: '2026-03-10' }))).toEqual(['halfDay']);
    expect(fields(run({ halfDay: 'FIRST_HALF', startDate: '2026-03-08', endDate: '2026-03-08' }))).toEqual(['startDate']);
  });
});

describe('overlap and balance', () => {
  it('flags an overlap', () => {
    expect(run({}, { overlaps: true }).issues).toMatchObject([{ code: 'OVERLAP' }]);
  });
  it('allows exactly the remaining balance and rejects one more', () => {
    expect(run({}, { balanceRemaining: 1 }).issues).toEqual([]);
    expect(run({}, { balanceRemaining: 0.5 }).issues).toMatchObject([{ code: 'INSUFFICIENT_BALANCE' }]);
    expect(run({ halfDay: 'FIRST_HALF' }, { balanceRemaining: 0.5 }).issues).toEqual([]);
  });
  it('unlimited leave types ignore balance', () => {
    expect(run({}, { balanceRemaining: null }).issues).toEqual([]);
  });
});

describe('state machine (REQ-LEAVE-04)', () => {
  const future = { startDate: '2026-03-09', today: TODAY };
  const ok: Array<[string, string]> = [
    ['DRAFT', 'PENDING'],
    ['PENDING', 'APPROVED'],
    ['PENDING', 'REJECTED'],
    ['PENDING', 'CANCELLED'],
    ['APPROVED', 'CANCELLED'],
  ];
  it.each(ok)('%s -> %s is allowed', (from, to) => {
    expect(canTransitionLeave(from as never, to as never, future)).toEqual({ allowed: true });
  });

  const all = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
  const bad = all.flatMap((f) => all.map((t) => [f, t] as [string, string])).filter(([f, t]) => !ok.some(([a, b]) => a === f && b === t));
  it.each(bad)('%s -> %s is refused', (from, to) => {
    expect(canTransitionLeave(from as never, to as never, future).allowed).toBe(false);
  });

  it('approved leave can be cancelled only before its start date', () => {
    expect(canTransitionLeave('APPROVED', 'CANCELLED', { startDate: '2026-03-03', today: TODAY }).allowed).toBe(true);
    expect(canTransitionLeave('APPROVED', 'CANCELLED', { startDate: TODAY, today: TODAY }).allowed).toBe(false);
    expect(canTransitionLeave('APPROVED', 'CANCELLED', { startDate: '2026-03-01', today: TODAY }).allowed).toBe(false);
  });
});
