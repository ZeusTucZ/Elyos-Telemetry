import XLSX from 'xlsx';
import pool from '../config/dbConfig.js';

async function getPostgresData() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM lectures');
        client.release();
        return result.rows;
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
