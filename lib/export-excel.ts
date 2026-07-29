import * as XLSX from 'xlsx';

export interface ExcelSheet {
  name: string;
  rows: Record<string, string | number>[];
}

export function exportToExcel(sheets: ExcelSheet[], filename: string) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
