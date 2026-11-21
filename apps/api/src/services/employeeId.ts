export const EMPLOYEE_ID_PATTERN = /^FAC-(\d{4,})$/;

export function formatEmployeeId(n: number): string {
  return `FAC-${String(n).padStart(4, '0')}`;
}

export function parseEmployeeNumber(id: string): number | null {
  const m = EMPLOYEE_ID_PATTERN.exec(id);
  return m ? Number(m[1]) : null;
}

/** Next employee ID: highest existing number + 1, starting at FAC-0001. Ignores malformed IDs. */
export function nextEmployeeId(existing: string[]): string {
  let max = 0;
  for (const id of existing) {
    const n = parseEmployeeNumber(id);
    if (n !== null && n > max) max = n;
  }
  return formatEmployeeId(max + 1);
}
