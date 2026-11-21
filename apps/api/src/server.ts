import { createApp } from './app';
import { loadConfig } from './config';
import { logger } from './logger';

const cfg = loadConfig(); // fails fast with a clear message if env is missing
createApp({ config: cfg }).listen(cfg.port, () => logger.info(`FAMS API listening on http://localhost:${cfg.port}`));
