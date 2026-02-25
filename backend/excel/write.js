import XLSX, { write } from 'xlsx';

import { Pool } from 'pg';
import { config } from 'dotenv';

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
});

async function getPostgresData() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM lectures');
        client.release();
        return result.rows;
        client.release();
    } catch (err) {
        console.log('Error fetching data from PostgreSQL:', err);
        throw err;
    }
}

async function writeToExcel(data) {
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, 'output.xlsx');
    } catch (err) {
        console.log('Error writing excel file:', err);
        throw err;
    }
}

async function exportPostgresToExcels() {
    try {
        const postgresData = await getPostgresData();
        await writeToExcel(postgresData);
    } catch (err) {
        console.log('Failed to export data to excel:', err);
    } finally {
        await pool.end();
    }
}

exportPostgresToExcels();
