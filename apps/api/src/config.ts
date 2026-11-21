import 'dotenv/config';

export interface Config {
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  clientUrl: string;
  nodeEnv: string;
  port: number;
}

const REQUIRED = ['DATABASE_URL', 'DIRECT_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];

/** Fails fast with a clear message when required environment variables are missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to apps/api/.env and fill them in.`,
    );
  }
  return {
    databaseUrl: env.DATABASE_URL as string,
    jwtAccessSecret: env.JWT_ACCESS_SECRET as string,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET as string,
    clientUrl: env.CLIENT_URL as string,
    nodeEnv: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 4000),
  };
}
