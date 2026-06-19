import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Loaded as the very first import in main.ts (before anything pulls in @mock-bank/database,
// which captures DATABASE_URL at module-load time). Local env wins; the repo-root .env
// supplies anything shared (e.g. the database URL) that the local file omits.
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
