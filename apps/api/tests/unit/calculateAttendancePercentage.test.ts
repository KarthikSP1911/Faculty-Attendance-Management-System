import { calculateAttendancePercentage, csvCell, emptyCounts, musterCode, toCsv, type Counts } from '../../src/services/reportRules';
import { openApiSpec } from '../../src/openapi';
import { renderPdf } from '../../src/services/exportService';

const c = (over: Partial<Counts>): Counts => ({ ...emptyCounts(), ...over });

describe('attendance percentage (REQ-RPT-04)', () => {
  it.each([
    [c({ present: 26 }), 26, 100],
    [c({ present: 13, absent: 13 }), 26, 50],
    [c({ present: 20, halfDay: 2, absent: 4 }), 26, 80.77],
    [c({ present: 18, onLeave: 2, absent: 6 }), 26, 76.92],
    [c({ present: 18, late: 4, absent: 4 }), 26, 84.62],
    [c({ present: 1, absent: 2 }), 3, 33.33],
    [c({ present: 2, absent: 1 }), 3, 66.67],
  ])('%j over %i working days is %f', (counts, wd, expected) => {
    expect(calculateAttendancePercentage(counts, wd)).toBe(expected);
  });

  it('is 0 when there are no working days', () => {
    expect(calculateAttendancePercentage(c({ present: 1 }), 0)).toBe(0);
    expect(calculateAttendancePercentage(c({}), -1)).toBe(0);
  });
  it('a half day is worth half and a late deduction takes half a day off', () => {
    expect(calculateAttendancePercentage(c({ halfDay: 2 }), 2)).toBe(50);
    expect(calculateAttendancePercentage(c({ late: 3, lateDeductions: 1 }), 3)).toBe(83.33);
  });
  it('stays within 0 and 100', () => {
    expect(calculateAttendancePercentage(c({ present: 5 }), 4)).toBe(100);
    expect(calculateAttendancePercentage(c({ lateDeductions: 3 }), 4)).toBe(0);
  });
  it('the 75 % defaulter boundary: 18/24 is exactly 75', () => {
    expect(calculateAttendancePercentage(c({ present: 18, absent: 6 }), 24)).toBe(75);
    expect(calculateAttendancePercentage(c({ present: 17, absent: 7 }), 24)).toBe(70.83);
  });
});

describe('muster codes (REQ-RPT-02)', () => {
  it.each([
    ['PRESENT', 'P'],
    ['LATE', 'L'],
    ['HALF_DAY', 'HD'],
    ['ABSENT', 'A'],
    ['ON_LEAVE', 'OL'],
    ['HOLIDAY', 'H'],
    ['WEEKLY_OFF', 'WO'],
    ['PENDING', 'P'],
  ])('%s -> %s', (status, code) => expect(musterCode(status as never)).toBe(code));
});

describe('CSV export (REQ-RPT-03)', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(12.5)).toBe('12.5');
  });
  it('neutralises spreadsheet formulas but keeps plain negative numbers', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('+1+1')).toBe("'+1+1");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell(-5)).toBe('-5');
  });
  it('builds rows with CRLF endings', () => {
    expect(toCsv(['A', 'B'], [[1, 'x,y']])).toBe('A,B\r\n1,"x,y"\r\n');
  });
});

describe('PDF export', () => {
  it('produces a PDF, including across several pages', async () => {
    const rows = Array.from({ length: 120 }, (_, i) => [`FAC-${i}`, 'Name', 'CSE', 'PRESENT']);
    const buf = await renderPdf('Test report', ['ID', 'Name', 'Dept', 'Status'], rows);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(1000);
  });
});

describe('OpenAPI spec', () => {
  it('documents every route group with the envelope and security', () => {
    expect(openApiSpec.openapi).toBe('3.0.3');
    const paths = Object.keys(openApiSpec.paths);
    for (const p of ['/auth/login', '/faculty', '/attendance/check-in', '/leave/{id}/approve', '/reports/muster', '/audit']) {
      expect(paths).toContain(p);
    }
    const login = openApiSpec.paths['/auth/login'].post as { security?: unknown };
    expect(login.security).toBeUndefined();
    const audit = openApiSpec.paths['/audit'].get as { security: unknown[]; responses: Record<string, unknown> };
    expect(audit.security).toHaveLength(2);
    expect(audit.responses['403']).toBeDefined();
    const del = openApiSpec.paths['/departments/{id}'].delete as { responses: Record<string, unknown>; parameters: unknown[] };
    expect(del.responses['204']).toEqual({ description: 'No content' });
    expect(del.parameters).toHaveLength(1);
  });
});
