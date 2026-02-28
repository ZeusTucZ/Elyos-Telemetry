import { config } from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../env/.env') });

const isTrue = (value) => String(value).toLowerCase() === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const sslMode = String(process.env.PGSSLMODE || '').toLowerCase();
const hasSslModeInUrl = /[?&]sslmode=/i.test(process.env.DATABASE_URL || '');
const shouldUseSsl =
  isTrue(process.env.DB_SSL) || isProduction || hasSslModeInUrl || Boolean(sslMode);
const caCertPath = process.env.DB_CA_CERT_PATH
  ? path.resolve(process.env.DB_CA_CERT_PATH)
  : path.resolve(__dirname, '../certs/ca-certificate.crt');
const caCert = fs.existsSync(caCertPath) ? fs.readFileSync(caCertPath, 'utf8') : undefined;
const strictSsl =
  isTrue(process.env.DB_SSL_REJECT_UNAUTHORIZED) ||
  Boolean(caCert) ||
  sslMode === 'verify-ca' ||
  sslMode === 'verify-full';

const ssl =
  shouldUseSsl
    ? {
        rejectUnauthorized: strictSsl,
        ...(caCert ? { ca: caCert } : {}),
      }
    : false;

const sanitizeDatabaseUrl = (rawUrl) => {
  if (!rawUrl) return rawUrl;

  try {
    const parsedUrl = new URL(rawUrl);
    parsedUrl.searchParams.delete('sslmode');
    parsedUrl.searchParams.delete('sslcert');
    parsedUrl.searchParams.delete('sslkey');
    parsedUrl.searchParams.delete('sslrootcert');
    return parsedUrl.toString();
  } catch {
    return rawUrl;
  }
};

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
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
