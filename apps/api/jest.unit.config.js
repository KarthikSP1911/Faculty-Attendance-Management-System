/** Unit tests only: no database, no thresholds. Used by Stryker. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testTimeout: 10000,
  moduleNameMapper: { '^pdfkit$': '<rootDir>/../../node_modules/pdfkit/js/pdfkit.standalone.js' },
};
