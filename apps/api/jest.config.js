/** Full run (unit + integration) with coverage thresholds. Use --runInBand. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/helpers/env.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/types/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'html', 'lcov'],
  coverageThreshold: { global: { lines: 85, branches: 80 } },
  reporters: ['default', ['jest-junit', { outputDirectory: 'reports/junit', outputName: 'junit.xml' }]],
};
