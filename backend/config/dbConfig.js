import { config } from 'dotenv';
import { Pool } from 'pg';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../env/.env') });

const parsedDbPort = Number.parseInt(process.env.DB_PORT ?? '', 10);
const dbPort = Number.isInteger(parsedDbPort) ? parsedDbPort : 5432;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: dbPort,
  ssl: { rejectUnauthorized: false },
});

export default pool;
