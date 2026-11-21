import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Designation, AttendanceStatus, LeaveStatus, HalfDay } from '@prisma/client';

// All names, emails and records below are SYNTHETIC demo data.
const prisma = new PrismaClient();

export const DEMO_PASSWORD = 'Demo@1234';
const TZ = '+05:30'; // Asia/Kolkata

// Deterministic pseudo-random so every seed run produces the same data.
let seedState = 20261121;
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
};
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const dateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
const at = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00${TZ}`);
const addDays = (s: string, n: number) => ymd(new Date(dateOnly(s).getTime() + n * 86400000));
const pad = (n: number) => String(n).padStart(2, '0');

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Meera', 'Kabir', 'Ananya', 'Vikram', 'Isha', 'Arjun', 'Neha', 'Sanjay', 'Priya', 'Rahul', 'Kavya', 'Manoj', 'Sneha', 'Harish', 'Pooja', 'Nikhil', 'Lakshmi'];
const LAST = ['Sharma', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Menon', 'Patel', 'Rao', 'Das', 'Kulkarni'];
const DESIGNATIONS: Designation[] = ['ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR', 'LECTURER'];
const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science and Engineering' },
  { code: 'ECE', name: 'Electronics and Communication' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
];

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const today = ymd(new Date());
  const year = Number(today.slice(0, 4));

  // Clean slate (children first)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.notification.deleteMany(), prisma.refreshToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(), prisma.regularizationRequest.deleteMany(),
    prisma.leaveRequest.deleteMany(), prisma.leaveBalance.deleteMany(), prisma.attendanceRecord.deleteMany(),
    prisma.holiday.deleteMany(), prisma.department.updateMany({ data: { hodId: null } }),
    prisma.faculty.deleteMany(), prisma.user.deleteMany(), prisma.department.deleteMany(),
    prisma.shift.deleteMany(), prisma.leaveType.deleteMany(), prisma.attendanceRule.deleteMany(),
  ]);

  await prisma.attendanceRule.create({ data: {} });
  const shift = await prisma.shift.create({
    data: { name: 'General Shift', startTime: '09:00', endTime: '17:00', workingDays: [1, 2, 3, 4, 5, 6], isDefault: true },
  });
  const types = await Promise.all([
    prisma.leaveType.create({ data: { code: 'CL', name: 'Casual Leave', yearlyQuota: 12 } }),
    prisma.leaveType.create({ data: { code: 'SL', name: 'Sick Leave', yearlyQuota: 10 } }),
    prisma.leaveType.create({ data: { code: 'EL', name: 'Earned Leave', yearlyQuota: 15 } }),
    prisma.leaveType.create({ data: { code: 'OD', name: 'On Duty', yearlyQuota: null, requiresReason: true } }),
  ]);

  const admin = await prisma.user.create({ data: { email: 'admin@fams.test', passwordHash: hash, role: 'ADMIN' } });

  // Holidays: a few across the last 3 months and the next 2 months
  const holidayDefs: [number, string, 'NATIONAL' | 'INSTITUTIONAL' | 'OPTIONAL'][] = [
    [-75, 'Founders Day', 'INSTITUTIONAL'], [-50, 'Gandhi Jayanti', 'NATIONAL'],
    [-30, 'Diwali', 'NATIONAL'], [-12, 'Annual Sports Day', 'INSTITUTIONAL'],
    [20, 'Christmas', 'NATIONAL'], [40, 'Republic Day', 'NATIONAL'], [10, 'Regional Festival', 'OPTIONAL'],
  ];
  const holidays = new Set<string>();
  for (const [off, name, type] of holidayDefs) {
    const d = addDays(today, off);
    if (dateOnly(d).getUTCDay() === 0) continue; // skip Sundays
    holidays.add(d);
    await prisma.holiday.create({ data: { date: dateOnly(d), name, type } });
  }

  type Person = { facultyId: string; userId: string; deptCode: string; role: 'HOD' | 'FACULTY' };
  const people: Person[] = [];
  let empNo = 1;
  const emp = () => `FAC-${String(empNo++).padStart(4, '0')}`;
  let nameIdx = 0;
  const nextName = () => `${FIRST[nameIdx % FIRST.length]} ${LAST[Math.floor(nameIdx / FIRST.length) % LAST.length]}`;

  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.create({ data: { code: d.code, name: d.name } });
    // 1 HOD + 10 faculty per department (4 HOD + 40 faculty)
    for (let i = 0; i < 11; i++) {
      const isHod = i === 0;
      const name = nextName(); nameIdx++;
      const employeeId = emp();
      const email = isHod ? `hod.${d.code.toLowerCase()}@fams.test` : `${d.code.toLowerCase()}.faculty${i}@fams.test`;
      const user = await prisma.user.create({ data: { email, passwordHash: hash, role: isHod ? 'HOD' : 'FACULTY' } });
      const f = await prisma.faculty.create({
        data: {
          employeeId, userId: user.id, fullName: name, phone: `${pick(['6', '7', '8', '9'])}${String(Math.floor(rand() * 1e9)).padStart(9, '0')}`,
          departmentId: dept.id, designation: isHod ? 'PROFESSOR' : pick(DESIGNATIONS),
          dateOfJoining: dateOnly(`${2012 + Math.floor(rand() * 12)}-${pad(1 + Math.floor(rand() * 12))}-${pad(1 + Math.floor(rand() * 28))}`),
          shiftId: shift.id,
        },
      });
      if (isHod) await prisma.department.update({ where: { id: dept.id }, data: { hodId: f.id } });
      people.push({ facultyId: f.id, userId: user.id, deptCode: d.code, role: isHod ? 'HOD' : 'FACULTY' });
    }
  }

  // Leave balances for every faculty member
  await prisma.leaveBalance.createMany({
    data: people.flatMap((p) =>
      types.map((t) => ({ facultyId: p.facultyId, leaveTypeId: t.id, year, allotted: t.yearlyQuota ?? 0 })),
    ),
  });

  // Leave requests in every state (use faculty 1..6 of CSE)
  const cse = people.filter((p) => p.deptCode === 'CSE' && p.role === 'FACULTY');
  const CL = types[0].id, SL = types[1].id, OD = types[3].id;
  const hodCse = people.find((p) => p.deptCode === 'CSE' && p.role === 'HOD')!;
  const leaveDefs: { f: Person; type: string; start: number; end: number; days: number; status: LeaveStatus; half?: HalfDay; reason: string }[] = [
    { f: cse[0], type: CL, start: 5, end: 6, days: 2, status: 'DRAFT', reason: 'Family function' },
    { f: cse[1], type: CL, start: 8, end: 9, days: 2, status: 'PENDING', reason: 'Personal work' },
    { f: cse[2], type: SL, start: -20, end: -19, days: 2, status: 'APPROVED', reason: 'Fever and rest' },
    { f: cse[3], type: CL, start: 15, end: 16, days: 2, status: 'APPROVED', reason: 'Travel' },
    { f: cse[4], type: CL, start: -10, end: -10, days: 1, status: 'REJECTED', reason: 'Short notice leave' },
    { f: cse[5], type: CL, start: 12, end: 12, days: 1, status: 'CANCELLED', reason: 'Plans changed' },
    { f: cse[6], type: CL, start: 18, end: 18, days: 0.5, status: 'PENDING', half: 'FIRST_HALF', reason: 'Bank work' },
    { f: cse[7], type: OD, start: 25, end: 26, days: 2, status: 'APPROVED', reason: 'Conference presentation' },
  ];
  for (const l of leaveDefs) {
    await prisma.leaveRequest.create({
      data: {
        facultyId: l.f.facultyId, leaveTypeId: l.type, startDate: dateOnly(addDays(today, l.start)), endDate: dateOnly(addDays(today, l.end)),
        days: l.days, halfDay: l.half ?? 'NONE', reason: l.reason, status: l.status,
        reviewedById: ['APPROVED', 'REJECTED'].includes(l.status) ? hodCse.userId : null,
        reviewComment: l.status === 'REJECTED' ? 'Insufficient staffing that day' : l.status === 'APPROVED' ? 'Approved' : null,
        reviewedAt: ['APPROVED', 'REJECTED'].includes(l.status) ? new Date() : null,
      },
    });
    if (l.status === 'APPROVED' && l.type !== OD) {
      await prisma.leaveBalance.update({
        where: { facultyId_leaveTypeId_year: { facultyId: l.f.facultyId, leaveTypeId: l.type, year } },
        data: { used: l.days },
      });
    }
  }
  const leaveDays = new Map<string, Set<string>>(); // facultyId -> approved past leave dates
  for (const l of leaveDefs.filter((x) => x.status === 'APPROVED' && x.start < 0)) {
    const s = leaveDays.get(l.f.facultyId) ?? new Set<string>();
    for (let o = l.start; o <= l.end; o++) s.add(addDays(today, o));
    leaveDays.set(l.f.facultyId, s);
  }

  // 90 days of attendance (past days only; not today)
  const rows: {
    facultyId: string; date: Date; checkInAt: Date | null; checkOutAt: Date | null;
    workedMinutes: number | null; status: AttendanceStatus; lateDeduction: boolean;
  }[] = [];
  for (let off = -90; off < 0; off++) {
    const day = addDays(today, off);
    const dow = dateOnly(day).getUTCDay();
    for (const p of people) {
      const base = { facultyId: p.facultyId, date: dateOnly(day), checkInAt: null, checkOutAt: null, workedMinutes: null, lateDeduction: false };
      if (dow === 0) { rows.push({ ...base, status: 'WEEKLY_OFF' }); continue; }
      if (holidays.has(day)) { rows.push({ ...base, status: 'HOLIDAY' }); continue; }
      if (leaveDays.get(p.facultyId)?.has(day)) { rows.push({ ...base, status: 'ON_LEAVE' }); continue; }
      const r = rand();
      if (r < 0.04) { rows.push({ ...base, status: 'ABSENT' }); continue; }
      let inMin: number; let status: AttendanceStatus;
      if (r < 0.72) { inMin = 8 * 60 + 45 + Math.floor(rand() * 31); status = 'PRESENT'; }       // 08:45-09:15
      else if (r < 0.92) { inMin = 9 * 60 + 16 + Math.floor(rand() * 75); status = 'LATE'; }     // 09:16-10:30
      else { inMin = 10 * 60 + 31 + Math.floor(rand() * 60); status = 'HALF_DAY'; }             // after 10:30
      const outMin = 17 * 60 + Math.floor(rand() * 45);
      const worked = outMin - inMin;
      if (worked < 240) status = 'ABSENT'; else if (worked < 420 && status === 'PRESENT') status = 'HALF_DAY';
      const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      rows.push({ ...base, checkInAt: at(day, hm(inMin)), checkOutAt: at(day, hm(outMin)), workedMinutes: worked, status });
    }
  }
  await prisma.attendanceRecord.createMany({ data: rows });

  // A few notifications and a regularization request
  const f1 = cse[0];
  await prisma.notification.create({
    data: { userId: cse[2].userId, type: 'LEAVE_APPROVED', title: 'Leave approved', message: 'Your sick leave request was approved.' },
  });
  await prisma.regularizationRequest.create({
    data: {
      facultyId: f1.facultyId, date: dateOnly(addDays(today, -2)), requestedCheckIn: at(addDays(today, -2), '09:05'),
      reason: 'Forgot to check in because of a network outage', status: 'PENDING',
    },
  });
  await prisma.auditLog.create({
    data: { actorId: admin.id, action: 'CREATE', entity: 'Seed', entityId: 'initial', newValue: { note: 'synthetic demo data' }, ip: '127.0.0.1' },
  });

  console.log(`Seeded: 1 admin, ${DEPARTMENTS.length} departments, ${people.length} faculty (4 HOD + 40 faculty), ${rows.length} attendance rows, ${leaveDefs.length} leave requests.`);
  console.log(`Demo login: admin@fams.test | hod.cse@fams.test | cse.faculty1@fams.test  password: ${DEMO_PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
