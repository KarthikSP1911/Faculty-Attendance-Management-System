export type Role = 'ADMIN' | 'HOD' | 'FACULTY';
export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF';
export type LeaveStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type HalfDay = 'NONE' | 'FIRST_HALF' | 'SECOND_HALF';
export type HolidayType = 'NATIONAL' | 'INSTITUTIONAL' | 'OPTIONAL';
export type Designation = 'ASSISTANT_PROFESSOR' | 'ASSOCIATE_PROFESSOR' | 'PROFESSOR' | 'LECTURER';

export interface User {
  id: string;
  email: string;
  role: Role;
  faculty: { id: string; employeeId: string; fullName: string; departmentId: string } | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number | null;
  status: AttendanceStatus;
  regularized: boolean;
  lateDeduction: boolean;
}

export interface TodayInfo {
  date: string;
  serverTime: string;
  dayType: 'WORKING' | 'HOLIDAY' | 'WEEKLY_OFF';
  onLeave: 'FULL' | 'HALF' | null;
  holidayName: string | null;
  record: AttendanceRecord | null;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  yearlyQuota: number | null;
  requiresReason: boolean;
}

export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  year: number;
  allotted: string | number;
  used: string | number;
  leaveType: LeaveType;
}

export interface LeaveRequest {
  id: string;
  facultyId: string;
  facultyName: string;
  leaveType: { code: string; name: string };
  startDate: string;
  endDate: string;
  days: number;
  halfDay: HalfDay;
  reason: string;
  status: LeaveStatus;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface Regularization {
  id: string;
  facultyId: string;
  facultyName: string;
  date: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: RequestStatus;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export interface Counts {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  lateDeductions?: number;
}

export interface FacultyDashboard {
  today: TodayInfo;
  month: { counts?: Counts; workingDays: number; percentage: number };
  balances: LeaveBalance[];
}

export interface HodDashboard {
  today: { present: number; late: number; halfDay: number; absent: number; onLeave: number; notMarked: number };
  headcount: number;
  pendingApprovals: { leave: number; regularization: number };
  trend: { date: string; percentage: number | null }[];
}

export interface AdminDashboard {
  kpis: {
    totalFaculty: number;
    departments: number;
    today: { present: number; late: number; halfDay: number; absent: number; onLeave: number };
    pendingLeaves: number;
    pendingRegularizations: number;
  };
  departmentComparison: { department: string; percentage: number }[];
  defaulters: { employeeId: string; fullName: string; department: string; percentage: number }[];
  threshold: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod: { id: string; fullName: string; employeeId: string } | null;
  activeFacultyCount: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  workingDays: number[];
  isDefault: boolean;
}

export interface Rules {
  id: string;
  graceMinutes: number;
  lateCutoffTime: string;
  checkInOpenTime: string;
  checkInCloseTime: string;
  checkOutCloseTime: string;
  presentMinMinutes: number;
  halfDayMinMinutes: number;
  lateLimitPerMonth: number;
}

export interface FacultyMember {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  designation: Designation;
  dateOfJoining: string;
  status: 'ACTIVE' | 'INACTIVE';
  department: { id: string; code: string; name: string };
  shift: { id: string; name: string };
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ip: string | null;
  createdAt: string;
  actor: { email: string } | null;
}

export interface RangeRow {
  facultyId: string;
  employeeId: string;
  fullName: string;
  department: string;
  counts: Counts;
  workingDays: number;
  percentage: number;
}

export interface DailyRow {
  employeeId: string;
  fullName: string;
  department: string;
  status: AttendanceStatus | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number | null;
}

export interface Muster {
  month: string;
  days: string[];
  rows: { employeeId: string; fullName: string; department: string; codes: string[]; counts: Counts; workingDays: number; percentage: number }[];
}
