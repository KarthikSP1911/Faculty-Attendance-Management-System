import { prisma } from '../db';
import { logger } from '../logger';
import { getRules, recomputeRecord, resolveDay } from '../services/attendanceService';
import { clock } from '../utils/clock';
import { todayIST, toDateOnly } from '../utils/dates';
import { AppError } from '../utils/errors';

export interface AbsentJobResult {
  date: string;
  markedAbsent: number;
  markedOnLeave: number;
  closedMissedCheckOut: number;
  skipped: number;
}

/**
 * REQ-RULE-04. For one date: active faculty on a working day with no record become Absent,
 * approved full-day leave becomes On Leave, and open check-ins with no check-out are closed
 * as Half Day with a missed check-out notification. Safe to run twice: finished records are kept.
 */
export async function runAbsentJob(date: string = todayIST(clock.now())): Promise<AbsentJobResult> {
  if (date > todayIST(clock.now())) throw new AppError(400, 'FUTURE_DATE', 'The absent job cannot run for a future date');
  const rules = await getRules();
  const day = toDateOnly(date);
  const faculty = await prisma.faculty.findMany({
    where: { status: 'ACTIVE', dateOfJoining: { lte: day } },
    include: { shift: true, attendance: { where: { date: day } } },
  });

  const result: AbsentJobResult = { date, markedAbsent: 0, markedOnLeave: 0, closedMissedCheckOut: 0, skipped: 0 };
  for (const f of faculty) {
    const existing = f.attendance[0];
    if (existing && existing.status !== 'PENDING') {
      result.skipped++;
      continue;
    }
    if (existing) {
      await recomputeRecord(existing, f.shift.startTime, f.shift.workingDays, rules, true);
      await prisma.notification.create({
        data: {
          userId: f.userId,
          type: 'MISSED_CHECKOUT',
          title: 'Missed check-out',
          message: `You did not check out on ${date}. Submit a regularization request within 7 days.`,
        },
      });
      result.closedMissedCheckOut++;
      continue;
    }
    const d = await resolveDay(f.id, f.shift.workingDays, date);
    if (d.dayType !== 'WORKING') {
      result.skipped++;
      continue;
    }
    const status = d.leave === 'FULL' ? 'ON_LEAVE' : d.leave === 'HALF' ? 'HALF_DAY' : 'ABSENT';
    await prisma.attendanceRecord.create({ data: { facultyId: f.id, date: day, status } });
    if (status === 'ON_LEAVE') result.markedOnLeave++;
    else if (status === 'ABSENT') result.markedAbsent++;
    else result.skipped++;
  }
  logger.info({ ...result }, 'absent job finished');
  return result;
}

const IST_OFFSET_MS = 330 * 60_000;

/** Milliseconds until the next 23:59 Asia/Kolkata. */
export function msUntilNextRun(now: Date): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const target = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 23, 59, 0);
  const diff = target - ist.getTime();
  return diff > 0 ? diff : diff + 86_400_000;
}

/** Starts the nightly schedule (no cron dependency); returns a stop function. */
export function startAbsentScheduler(): () => void {
  let timer: NodeJS.Timeout;
  const arm = () => {
    timer = setTimeout(async () => {
      try {
        await runAbsentJob();
      } catch (err) {
        logger.error({ err }, 'nightly absent job failed');
      }
      arm();
    }, msUntilNextRun(clock.now()));
    timer.unref();
  };
  arm();
  return () => clearTimeout(timer);
}
