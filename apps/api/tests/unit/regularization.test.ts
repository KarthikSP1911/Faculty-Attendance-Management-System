import { earliestRegularizableDate, validateRegularization, type RegularizationInput } from '../../src/services/regularizationRules';

const TODAY = '2026-03-10';
const input = (over: Partial<RegularizationInput> = {}): RegularizationInput => ({
  date: '2026-03-09',
  requestedCheckIn: '09:00',
  requestedCheckOut: '17:00',
  reason: 'Forgot to check out yesterday',
  today: TODAY,
  ...over,
});
const fields = (i: Partial<RegularizationInput>, used = 0) => validateRegularization(input(i), used).map((x) => x.field);

describe('date window (REQ-REG-01)', () => {
  it('accepts today and exactly 7 days back', () => {
    expect(fields({ date: TODAY })).toEqual([]);
    expect(fields({ date: '2026-03-03' })).toEqual([]);
    expect(earliestRegularizableDate(TODAY)).toBe('2026-03-03');
  });
  it('rejects 8 days back, the future and invalid dates', () => {
    expect(fields({ date: '2026-03-02' })).toEqual(['date']);
    expect(fields({ date: '2026-03-11' })).toEqual(['date']);
    expect(fields({ date: '2026-02-30' })).toEqual(['date']);
  });
});

describe('reason length (REQ-REG-01)', () => {
  it.each([
    [9, false],
    [10, true],
    [300, true],
    [301, false],
  ])('%i characters valid=%s', (n, valid) => {
    expect(fields({ reason: 'x'.repeat(n) }).length === 0).toBe(valid);
  });
});

describe('times', () => {
  it('needs at least one time, in HH:mm, with check-out after check-in', () => {
    expect(fields({ requestedCheckIn: null, requestedCheckOut: null })).toEqual(['requestedCheckIn']);
    expect(fields({ requestedCheckIn: undefined, requestedCheckOut: '17:00' })).toEqual([]);
    expect(fields({ requestedCheckIn: '9:00' })).toEqual(['requestedCheckIn']);
    expect(fields({ requestedCheckOut: '24:00' })).toEqual(['requestedCheckOut']);
    expect(fields({ requestedCheckIn: '17:00', requestedCheckOut: '17:00' })).toEqual(['requestedCheckOut']);
    expect(fields({ requestedCheckIn: '17:00', requestedCheckOut: '09:00' })).toEqual(['requestedCheckOut']);
  });
});

describe('monthly limit (REQ-REG-02)', () => {
  it('allows the 3rd request and refuses the 4th', () => {
    expect(validateRegularization(input(), 2)).toEqual([]);
    expect(validateRegularization(input(), 3)).toMatchObject([{ code: 'LIMIT_REACHED' }]);
    expect(validateRegularization(input(), 4)).toMatchObject([{ code: 'LIMIT_REACHED' }]);
  });
  it('reports input errors before the limit', () => {
    expect(validateRegularization(input({ reason: 'short' }), 3)).toMatchObject([{ code: 'INVALID' }]);
  });
});
