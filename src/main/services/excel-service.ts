import { Workbook } from "exceljs";

function colToNum(col: string): number {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function parseCellRef(ref: string): { row: number; col: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return { row: 0, col: 0 };
  return { col: colToNum(m[1]), row: parseInt(m[2], 10) };
}

export interface MergeRange {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}

function getMerges(ws: any): MergeRange[] {
  const raw: any[] = ws.model?.merges ?? [];
  return raw
    .map((m: any) => {
      // exceljs stores ranges as { from: {row, col}, to: {row, col} } objects
      if (m.from && m.to) {
        const top = Math.min(m.from.row, m.to.row);
        const left = Math.min(m.from.col, m.to.col);
        return {
          row: top,
          col: left,
          rowspan: Math.max(m.from.row, m.to.row) - top + 1,
          colspan: Math.max(m.from.col, m.to.col) - left + 1,
        };
      }
      // fallback: parse string range like "A1:D1"
      if (typeof m === "string") {
        const [a, b] = m.split(":");
        const tl = parseCellRef(a);
        const br = b ? parseCellRef(b) : tl;
        return {
          row: Math.min(tl.row, br.row),
          col: Math.min(tl.col, br.col),
          rowspan: Math.abs(tl.row - br.row) + 1,
          colspan: Math.abs(tl.col - br.col) + 1,
        };
      }
      return null;
    })
    .filter(Boolean) as MergeRange[];
}

let nextRowId = 1;

function resetRowIdCounter() {
  nextRowId = 1;
}

export async function readExcelFile(data: Buffer): Promise<{ sheets: string[] }> {
  resetRowIdCounter();
  const wb = new Workbook();
  await wb.xlsx.load(data);
  return { sheets: wb.worksheets.map((ws) => ws.name) };
}

export async function readSheetData(
  data: Buffer,
  sheetName: string,
): Promise<{ headers: string[]; rows: string[][]; rowIds: number[]; merges: MergeRange[]; headerRows: boolean[] }> {
  const wb = new Workbook();
  await wb.xlsx.load(data);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) return { headers: [], rows: [], rowIds: [], merges: [] };

  const merges = getMerges(ws);

  const limit = Math.min(ws.rowCount, 101);
  if (limit < 1) return { headers: [], rows: [], rowIds: [], merges };

  let colCount = 0;
  for (let r = 1; r <= limit; r++) {
    let lastCol = 0;
    ws.getRow(r).eachCell((cell, colNumber) => {
      if (cell.type) lastCol = colNumber;
    });
    if (lastCol > colCount) colCount = lastCol;
  }
  if (colCount < 1) return { headers: [], rows: [], rowIds: [], merges };

  const hasNameLabel = (cell: any): boolean => {
    if (!cell?.type) return false;
    try {
      const text = cell.text?.toString() ?? "";
      return /(?:^|[^a-z])name(?:$|[^a-z])/i.test(text);
    } catch {
      return false;
    }
  };

  let headerRow = 1;
  let dataStartRow = 2;
  for (let r = 1; r <= limit; r++) {
    const row = ws.getRow(r);
    let found = false;
    row.eachCell((cell) => {
      if (hasNameLabel(cell)) found = true;
    });
    if (found) {
      headerRow = r;
      dataStartRow = r + 1;
      break;
    }
  }

  const headers: string[] = new Array(colCount).fill("");
  ws.getRow(headerRow).eachCell((cell, colNumber) => {
    if (cell.type) {
      try {
        headers[colNumber - 1] = cell.text?.toString() ?? "";
      } catch {
        headers[colNumber - 1] = "";
      }
    }
  });

  const rows: string[][] = [];
  const rowIds: number[] = [];
  const headerRows: boolean[] = [];
  for (let r = 1; r <= limit; r++) {
    const row = ws.getRow(r);
    const values: string[] = new Array(colCount).fill("");
    let isHeader = r < dataStartRow;
    row.eachCell((cell, colNumber) => {
      if (cell.type) {
        try {
          const text = cell.text?.toString() ?? "";
          if (hasNameLabel(cell)) isHeader = true;
          values[colNumber - 1] = text;
        } catch {
          values[colNumber - 1] = "";
        }
      }
    });
    rows.push(values);
    rowIds.push(nextRowId++);
    headerRows.push(isHeader);
  }

  return { headers, rows, rowIds, merges, headerRows, headerRow };
}

interface VoterRow {
  voterId: number;
  name: string;
  precinct: string;
  barangay: string;
  isGiven: number;
}

export async function exportExcel(savePath: string, onlySelected = false) {
  try {
    const { getDatabase } = await import("../database");
    const db = getDatabase();
    const query = onlySelected
      ? "SELECT * FROM voter WHERE isGiven = 1"
      : "SELECT * FROM voter";
    const voters = db.prepare(query).all() as VoterRow[];

    if (voters.length < 1) {
      return {
        msg: onlySelected
          ? "No selected voters to export."
          : "No voters to export.",
        success: false,
      };
    }

    const workBook = new Workbook();
    const workSheet = workBook.addWorksheet("Sheet 1");

    workSheet.getCell("A1").value = "VOTER ID";
    workSheet.getCell("B1").value = "NAME";
    workSheet.getCell("C1").value = "BARANGAY";
    workSheet.getCell("D1").value = "PRECINCT";

    workSheet.getColumn(1).width = 25;
    workSheet.getColumn(2).width = 50;
    workSheet.getColumn(3).width = 30;
    workSheet.getColumn(4).width = 25;

    ["A1", "B1", "C1", "D1"].forEach((cellRef) => {
      const cell = workSheet.getCell(cellRef);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { bold: true, size: 14 };
    });

    for (let i = 0; i < voters.length; i++) {
      const row = i + 2;
      workSheet.getCell(`A${row}`).value = voters[i].voterId;
      workSheet.getCell(`B${row}`).value = voters[i].name;
      workSheet.getCell(`C${row}`).value = voters[i].barangay;
      workSheet.getCell(`D${row}`).value = voters[i].precinct;

      [`A${row}`, `B${row}`, `C${row}`, `D${row}`].forEach((cellRef) => {
        const cell = workSheet.getCell(cellRef);
        cell.alignment = { horizontal: "left", vertical: "middle" };
        cell.font = { bold: true, size: 12 };

        if (!onlySelected && voters[i].isGiven === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "9E005DFF" },
          };
        }
      });
    }
    await workBook.xlsx.writeFile(savePath);

    return {
      msg: "Successfully exported excel file.",
      success: true,
      filePath: savePath,
    };
  } catch (error: any) {
    return { msg: error.message, success: false };
  }
}
