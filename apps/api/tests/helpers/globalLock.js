/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Serialises Jest runs that share the fams_test schema. A second run waits for the
 * first to finish instead of truncating tables underneath it.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOCK = path.join(os.tmpdir(), 'fams-jest.lock');
const WAIT_MS = 20 * 60 * 1000;

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

module.exports = async function globalSetup() {
  const start = Date.now();
  for (;;) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      return;
    } catch {
      let owner = NaN;
      try {
        owner = Number(fs.readFileSync(LOCK, 'utf8'));
      } catch {
        continue;
      }
      if (!alive(owner)) {
        try {
          fs.unlinkSync(LOCK);
        } catch {
          /* another waiter removed it */
        }
        continue;
      }
      if (Date.now() - start > WAIT_MS) throw new Error('Timed out waiting for another Jest run to finish');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};
