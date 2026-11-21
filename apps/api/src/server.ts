import { createApp } from './app';
import { loadConfig } from './config';
import { startAbsentScheduler } from './jobs/absentJob';
import { logger } from './logger';

const cfg = loadConfig(); // fails fast with a clear message if env is missing
createApp({ config: cfg }).listen(cfg.port, () => logger.info(`FAMS API listening on http://localhost:${cfg.port}`));
startAbsentScheduler(); // nightly 23:59 IST absent job (REQ-RULE-04)
