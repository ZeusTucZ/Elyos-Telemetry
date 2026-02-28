import { config } from 'dotenv';
import { Pool } from 'pg';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../env/.env') });

const isTrue = (value) => String(value).toLowerCase() === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const ssl =
  isTrue(process.env.DB_SSL) || isProduction
    ? {
        rejectUnauthorized: isTrue(process.env.DB_SSL_REJECT_UNAUTHORIZED),
      }
    : false;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
      ssl,
    };

const pool = new Pool(poolConfig);

export default pool;
