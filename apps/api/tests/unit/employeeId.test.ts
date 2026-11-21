import { formatEmployeeId, nextEmployeeId, parseEmployeeNumber } from '../../src/services/employeeId';

describe('employee ID generation (REQ-FAC-02)', () => {
  it('starts at FAC-0001', () => expect(nextEmployeeId([])).toBe('FAC-0001'));
  it('increments the highest existing number', () => {
    expect(nextEmployeeId(['FAC-0001', 'FAC-0007', 'FAC-0003'])).toBe('FAC-0008');
  });
  it('pads to 4 digits and grows beyond', () => {
    expect(formatEmployeeId(9)).toBe('FAC-0009');
    expect(formatEmployeeId(9999)).toBe('FAC-9999');
    expect(nextEmployeeId(['FAC-9999'])).toBe('FAC-10000');
  });
  it('ignores malformed IDs', () => {
    expect(nextEmployeeId(['XYZ', 'FAC-12', 'fac-0005', 'FAC-0002'])).toBe('FAC-0003');
  });
  it('parses numbers and rejects bad formats', () => {
    expect(parseEmployeeNumber('FAC-0042')).toBe(42);
    expect(parseEmployeeNumber('FAC-042')).toBeNull();
    expect(parseEmployeeNumber('EMP-0042')).toBeNull();
  });
});
