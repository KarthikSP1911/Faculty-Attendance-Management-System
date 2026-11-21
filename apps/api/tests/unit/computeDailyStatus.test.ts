import {
  classifyArrival,
  classifyHours,
  computeDailyStatus,
  workedMinutesBetween,
  type DailyStatusInput,
} from '../../src/services/attendanceRules';
import { DEFAULT_RULES, MONDAY, ist } from '../helpers/time';

const base = { shiftStart: '09:00', rules: DEFAULT_RULES };
const day = (over: Partial<DailyStatusInput>): DailyStatusInput => ({ dayType: 'WORKING', ...base, ...over });

describe('arrival boundaries (REQ-RULE-02)', () => {
  it.each([
    ['08:59', 'ON_TIME'],
    ['09:00', 'ON_TIME'],
    ['09:15', 'ON_TIME'],
    ['09:15:59', 'ON_TIME'],
    ['09:16', 'LATE'],
    ['10:30', 'LATE'],
    ['10:30:59', 'LATE'],
    ['10:31', 'HALF_DAY'],
    ['11:59', 'HALF_DAY'],
  ])('check-in at %s is %s', (time, expected) => {
    expect(classifyArrival(ist(MONDAY, time), '09:00', DEFAULT_RULES)).toBe(expected);
  });

  it('follows a changed grace period', () => {
    const rules = { ...DEFAULT_RULES, graceMinutes: 0 };
    expect(classifyArrival(ist(MONDAY, '09:00'), '09:00', rules)).toBe('ON_TIME');
    expect(classifyArrival(ist(MONDAY, '09:01'), '09:00', rules)).toBe('LATE');
    const wide = { ...DEFAULT_RULES, graceMinutes: 60 };
    expect(classifyArrival(ist(MONDAY, '10:00'), '09:00', wide)).toBe('ON_TIME');
    expect(classifyArrival(ist(MONDAY, '10:01'), '09:00', wide)).toBe('LATE');
  });

  it('uses the shift start, not a fixed 09:00', () => {
    expect(classifyArrival(ist(MONDAY, '08:30'), '08:00', DEFAULT_RULES)).toBe('LATE');
  });
});

describe('worked-hours boundaries (REQ-RULE-03)', () => {
  it.each([
    [0, 'ABSENT'],
    [239, 'ABSENT'],
    [240, 'HALF_DAY'],
    [241, 'HALF_DAY'],
    [419, 'HALF_DAY'],
    [420, 'PRESENT'],
    [421, 'PRESENT'],
    [600, 'PRESENT'],
  ])('%i minutes worked is %s', (minutes, expected) => {
    expect(classifyHours(minutes, DEFAULT_RULES)).toBe(expected);
  });

  it('measures whole minutes and never goes negative', () => {
    expect(workedMinutesBetween(ist(MONDAY, '09:00'), ist(MONDAY, '09:00:59'))).toBe(0);
    expect(workedMinutesBetween(ist(MONDAY, '09:00'), ist(MONDAY, '16:00'))).toBe(420);
    expect(workedMinutesBetween(ist(MONDAY, '10:00'), ist(MONDAY, '09:00'))).toBe(0);
  });
});

describe('combined daily status', () => {
  const run = (inT: string, outT: string | null, over: Partial<DailyStatusInput> = {}) =>
    computeDailyStatus(day({ checkInAt: ist(MONDAY, inT), checkOutAt: outT ? ist(MONDAY, outT) : null, ...over }));

  it('on time and a full day is Present', () => {
    expect(run('09:00', '17:00')).toMatchObject({ status: 'PRESENT', workedMinutes: 480, arrival: 'ON_TIME' });
  });
  it('exactly 7 hours is Present and 6h59 is Half Day (6:59 / 7:00 boundary)', () => {
    expect(run('09:00', '16:00').status).toBe('PRESENT');
    expect(run('09:00', '15:59').status).toBe('HALF_DAY');
  });
  it('exactly 4 hours is Half Day and 3h59 is Absent (3:59 / 4:00 boundary)', () => {
    expect(run('09:00', '13:00').status).toBe('HALF_DAY');
    expect(run('09:00', '12:59').status).toBe('ABSENT');
  });
  it('a late arrival with a full day is Late', () => {
    expect(run('09:16', '17:00').status).toBe('LATE');
    expect(run('10:30', '18:00').status).toBe('LATE');
  });
  it('arriving after 10:30 is Half Day even with 7+ hours', () => {
    expect(run('10:31', '18:00').status).toBe('HALF_DAY');
  });
  it('a late arrival with a short day is Half Day, and under 4 hours is Absent', () => {
    expect(run('09:30', '14:00').status).toBe('HALF_DAY');
    expect(run('09:30', '12:00').status).toBe('ABSENT');
  });
  it('checked in with no check-out is Pending while the day is open', () => {
    expect(run('09:00', null)).toMatchObject({ status: 'PENDING', workedMinutes: null, arrival: 'ON_TIME' });
  });
  it('a missed check-out becomes Half Day once the day is closed', () => {
    expect(run('09:00', null, { dayClosed: true }).status).toBe('HALF_DAY');
  });
  it('no punches on a working day is Absent', () => {
    expect(computeDailyStatus(day({}))).toEqual({ status: 'ABSENT', workedMinutes: null, arrival: null });
  });
});

describe('day types take precedence (REQ-RULE-05)', () => {
  it('a holiday is Holiday', () => {
    expect(computeDailyStatus(day({ dayType: 'HOLIDAY' })).status).toBe('HOLIDAY');
  });
  it('a weekly off is Weekly Off', () => {
    expect(computeDailyStatus(day({ dayType: 'WEEKLY_OFF' })).status).toBe('WEEKLY_OFF');
  });
  it('a holiday beats approved leave, and weekly off beats leave', () => {
    expect(computeDailyStatus(day({ dayType: 'HOLIDAY', leave: 'FULL' })).status).toBe('HOLIDAY');
    expect(computeDailyStatus(day({ dayType: 'WEEKLY_OFF', leave: 'FULL' })).status).toBe('WEEKLY_OFF');
  });
  it('approved full-day leave is On Leave', () => {
    expect(computeDailyStatus(day({ leave: 'FULL' })).status).toBe('ON_LEAVE');
  });
  it('a half-day leave with no punches is Half Day', () => {
    expect(computeDailyStatus(day({ leave: 'HALF' })).status).toBe('HALF_DAY');
  });
  it('a half-day leave with punches is judged on the punches', () => {
    expect(
      computeDailyStatus(day({ leave: 'HALF', checkInAt: ist(MONDAY, '09:00'), checkOutAt: ist(MONDAY, '17:00') })).status,
    ).toBe('PRESENT');
  });
});
