import {
  missingColumns,
  normalizeDesignation,
  parseCsv,
  toRecords,
  validateCsvRows,
} from '../../src/services/csvImport';

const ctx = { departmentCodes: new Set(['CSE', 'ECE']), existingEmails: new Set(['taken@x.test']), today: '2026-03-02' };
const header = 'fullName,email,phone,departmentCode,designation,dateOfJoining';
const run = (...lines: string[]) => validateCsvRows(toRecords(parseCsv([header, ...lines].join('\n'))), ctx);

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and CRLF', () => {
    expect(parseCsv('a,"b,c","d ""q"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b,c', 'd "q"'],
      ['1', '2', '3'],
    ]);
  });
  it('skips blank lines and handles a missing trailing newline', () => {
    expect(parseCsv('a,b\n\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('header handling', () => {
  it('reports missing columns case-insensitively', () => {
    expect(missingColumns(['FULLNAME', 'Email'])).toEqual(['phone', 'departmentCode', 'designation', 'dateOfJoining']);
    expect(missingColumns(header.split(','))).toEqual([]);
  });
});

describe('normalizeDesignation', () => {
  it.each([
    ['Assistant Professor', 'ASSISTANT_PROFESSOR'],
    ['ASSOCIATE_PROFESSOR', 'ASSOCIATE_PROFESSOR'],
    ['  professor ', 'PROFESSOR'],
    ['lecturer', 'LECTURER'],
  ])('%s', (input, out) => expect(normalizeDesignation(input)).toBe(out));
  it('rejects unknown', () => expect(normalizeDesignation('Dean')).toBeUndefined());
});

describe('validateCsvRows (REQ-FAC-04)', () => {
  it('accepts a valid row', () => {
    const r = run('Asha Rao,ASHA@x.test,9876543210,CSE,Assistant Professor,2020-06-01');
    expect(r.errors).toEqual([]);
    expect(r.valid[0]).toEqual({
      row: 2,
      data: { fullName: 'Asha Rao', email: 'asha@x.test', phone: '9876543210', departmentCode: 'CSE', designation: 'ASSISTANT_PROFESSOR', dateOfJoining: '2020-06-01' },
    });
  });

  it('reports row-level errors with the file line number', () => {
    const r = run(
      'Asha Rao,asha@x.test,9876543210,CSE,Lecturer,2020-06-01',
      'B,bad-email,12345,XXX,Dean,2030-01-01',
    );
    expect(r.valid).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(3);
    const text = r.errors[0].messages.join(' | ');
    for (const part of ['fullName', 'email', 'phone', 'designation', 'cannot be in the future', 'unknown department']) {
      expect(text).toContain(part);
    }
  });

  it.each([
    ['name with digits', 'Asha 2,a@x.test,9876543210,CSE,Lecturer,2020-06-01', 'fullName'],
    ['phone starting with 5', 'Asha,a@x.test,5876543210,CSE,Lecturer,2020-06-01', 'phone'],
    ['impossible date', 'Asha,a@x.test,9876543210,CSE,Lecturer,2020-02-30', 'valid date'],
    ['existing email', 'Asha,taken@x.test,9876543210,CSE,Lecturer,2020-06-01', 'already registered'],
  ])('rejects %s', (_n, line, expected) => {
    expect(run(line).errors[0].messages.join()).toContain(expected);
  });

  it('flags duplicate emails inside the file', () => {
    const r = run('A B,dup@x.test,9876543210,CSE,Lecturer,2020-06-01', 'C D,dup@x.test,9876543211,ECE,Lecturer,2020-06-01');
    expect(r.valid).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ row: 3 });
    expect(r.errors[0].messages.join()).toContain('duplicated in this file');
  });

  it('accepts today as the joining date (boundary)', () => {
    expect(run('Asha,a@x.test,9876543210,CSE,Lecturer,2026-03-02').errors).toEqual([]);
    expect(run('Asha,a@x.test,9876543210,CSE,Lecturer,2026-03-03').errors).toHaveLength(1);
  });
});
