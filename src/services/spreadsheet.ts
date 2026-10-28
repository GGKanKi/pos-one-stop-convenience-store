import * as XLSX from "xlsx";

export type SpreadsheetCell = string | number | boolean | null | undefined;

export type SpreadsheetSheet = {
  name: string;
  rows: SpreadsheetCell[][];
};

export function exportWorkbook(filename: string, sheets: SpreadsheetSheet[]): void {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(sheet.rows),
      sheet.name.slice(0, 31) || "Sheet1"
    );
  }
  XLSX.writeFile(workbook, filename);
}

export function exportCsv(filename: string, rows: SpreadsheetCell[][]): void {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.writeFile({ SheetNames: ["Data"], Sheets: { Data: worksheet } }, filename, { bookType: "csv" });
}

export function readSpreadsheet(file: File): Promise<unknown[][]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("The selected file has no worksheet.");
    return XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
  });
}
