import { parseEmployeeNumber, EMPLOYEE_ID_PATTERN } from '../../src/services/employeeId';
import { canTransitionLeave } from '../../src/services/leaveRules';
import { validateRegularization } from '../../src/services/regularizationRules';

// Added after the first Stryker run to kill surviving mutants (see 05_Test_Automation/Mutation_Testing.md).

describe('employee ID pattern anchors', () => {
  it('rejects a prefix or suffix around a valid ID', () => {
    expect(parseEmployeeNumber('xFAC-0001')).toBeNull();
    expect(parseEmployeeNumber('FAC-0001x')).toBeNull();
    expect(EMPLOYEE_ID_PATTERN.test('FAC-0001\nFAC-0002')).toBe(false);
  });
});

describe('canTransitionLeave details', () => {
  it('blocks cancelling approved leave that starts today, with a message', () => {
    const r = canTransitionLeave('APPROVED', 'CANCELLED', { startDate: '2026-03-10', today: '2026-03-10' });
    expect(r).toEqual({ allowed: false, message: 'Approved leave can be cancelled only before it starts' });
  });
  it('allows cancelling approved leave that starts tomorrow', () => {
    expect(canTransitionLeave('APPROVED', 'CANCELLED', { startDate: '2026-03-11', today: '2026-03-10' })).toEqual({ allowed: true });
  });
  it('does not apply the start-date rule to a pending cancel or an approve', () => {
    expect(canTransitionLeave('PENDING', 'CANCELLED', { startDate: '2026-03-01', today: '2026-03-10' })).toEqual({ allowed: true });
    expect(canTransitionLeave('PENDING', 'APPROVED', { startDate: '2026-03-01', today: '2026-03-10' })).toEqual({ allowed: true });
  });
  it('explains an illegal transition in lower case', () => {
    expect(canTransitionLeave('REJECTED', 'APPROVED', { startDate: '2026-03-10', today: '2026-03-01' })).toEqual({
      allowed: false,
      message: 'A rejected leave request cannot become approved',
    });
  });
});

describe('validateRegularization details', () => {
  const base = { date: '2026-03-09', requestedCheckIn: '09:00', requestedCheckOut: '17:00', reason: 'Biometric was down', today: '2026-03-10' };
  const msgs = (o: Partial<Record<keyof typeof base, string | null>>, n = 0) => validateRegularization({ ...base, ...o } as Parameters<typeof validateRegularization>[0], n).map((i) => `${i.field}:${i.message}`);

  it('accepts a valid request', () => expect(msgs({})).toEqual([]));
  it('reports a malformed date', () => expect(msgs({ date: '2026-13-45' })).toEqual(['date:Date must be a valid YYYY-MM-DD date']));
  it('reports a future date', () => expect(msgs({ date: '2026-03-11' })).toEqual(['date:Date cannot be in the future']));
  it('reports a date outside the window', () => expect(msgs({ date: '2026-03-01' })[0]).toMatch(/^date:Regularization is allowed only for the last 7 days$/));
  it('trims the reason before measuring it', () => expect(msgs({ reason: '   short   ' })[0]).toBe('reason:Reason must be 10-300 characters'));
  it('requires at least one time', () => {
    expect(msgs({ requestedCheckIn: null, requestedCheckOut: null })[0]).toMatch(/^requestedCheckIn:Provide a check-in time/);
  });
  it('rejects malformed times with anchored pattern', () => {
    expect(msgs({ requestedCheckIn: 'x09:00' })).toContain('requestedCheckIn:Check-in time must be HH:mm');
    expect(msgs({ requestedCheckIn: '09:00x' })).toContain('requestedCheckIn:Check-in time must be HH:mm');
    expect(msgs({ requestedCheckOut: '17:00x' })).toContain('requestedCheckOut:Check-out time must be HH:mm');
    expect(msgs({ requestedCheckOut: 'x17:00' })).toContain('requestedCheckOut:Check-out time must be HH:mm');
  });
  it('requires check-out after check-in', () => expect(msgs({ requestedCheckIn: '17:00', requestedCheckOut: '09:00' })).toContain('requestedCheckOut:Check-out must be after check-in'));
  it('enforces the monthly limit with a message', () => {
    expect(validateRegularization(base, 3)).toEqual([
      { field: 'date', code: 'LIMIT_REACHED', message: 'You can raise at most 3 regularization requests per month' },
    ]);
  });
});
