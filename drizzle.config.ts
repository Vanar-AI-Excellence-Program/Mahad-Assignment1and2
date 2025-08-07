import type { Config } from 'drizzle-kit';
import { env } from '$env/dynamic/private';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL || 'postgresql://localhost:5432/authflow',
  },
  verbose: true,
  strict: true,
} satisfies Config; 