import postgres from 'postgres';

const postgresUrl = process.env.POSTGRES_URL!;
const isLocal = /localhost|127\.0\.0\.1/.test(new URL(postgresUrl).hostname);
export const sql = postgres(postgresUrl, { ssl: isLocal ? false : 'require' });
