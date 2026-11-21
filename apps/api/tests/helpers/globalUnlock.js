/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async function globalTeardown() {
  const lock = path.join(os.tmpdir(), 'fams-jest.lock');
  try {
    if (fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock);
  } catch {
    /* already gone */
  }
};
