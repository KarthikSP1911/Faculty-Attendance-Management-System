const fs = require('fs');
const path = require('path');

// Walk up to find node_modules/pdfkit (works from the repo and from Stryker's sandbox).
function findPdfkit() {
  let dir = __dirname;
  for (let i = 0; i < 6; i++, dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'pdfkit', 'js', 'pdfkit.standalone.js');
    if (fs.existsSync(p)) return p;
  }
  throw new Error('pdfkit standalone bundle not found');
}

/** Unit tests only: no database, no thresholds. Used by Stryker. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testTimeout: 10000,
  moduleNameMapper: { '^pdfkit$': findPdfkit() },
};
