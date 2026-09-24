export interface ExcelSheet {
  name: string;
  rows: Record<string, string | number>[];
}

export async function exportToExcel(sheets: ExcelSheet[], filename: string) {
  // Loaded on demand — exceljs is large and only needed when a user clicks export.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    // Same shape json_to_sheet produced: header row from the union of keys, in first-seen order.
    const headers: string[] = [];
    for (const row of sheet.rows) {
      for (const key of Object.keys(row)) {
        if (!headers.includes(key)) headers.push(key);
      }
    }
    worksheet.addRow(headers);
    for (const row of sheet.rows) {
      worksheet.addRow(headers.map((h) => row[h] ?? ''));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
