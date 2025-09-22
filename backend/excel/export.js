import XLSX, { write } from 'xlsx';

async function buildLecturesXlsxBuffer(data) {
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Lectu');
        XLSX.writeFile(wb, 'output.xlsx');
    } catch (err) {
        console.log('Error writing excel file:', err);
        throw err;
    }
}

modules.export = { buildLecturesXlsxBuffer };