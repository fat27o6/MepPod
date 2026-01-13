import XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

export function parseExcel(file) {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rows.map((r, idx) => ({
    medicineName: r['Tên thuốc'] || r['Medicine'],
    supplier: r['Nhà cung cấp'],
    batchcode: r['Mã lô'],
    quantity: Number(r['Số lượng']) || 0,
    unit_price: Number(r['Giá nhập']) || 0,
    expiry_date: r['Hạn sử dụng'],
    import_date: r['Ngày nhập'],
    importerName: r['Người nhập'],
    rowNumber: idx + 2
  }));
}

export function parseCSV(file) {
  return parse(file.buffer.toString(), {
    columns: true,
    skip_empty_lines: true
  });
}