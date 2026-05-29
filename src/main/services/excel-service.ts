import { getDatabase } from "../database";
import { Workbook } from "exceljs";

interface VoterRow {
  voterId: number;
  name: string;
  precinct: string;
  isGiven: number;
}

export async function exportExcel(savePath: string, onlySelected = false) {
  try {
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
    workSheet.getCell("C1").value = "PRECINCT";

    workSheet.getColumn(1).width = 25;
    workSheet.getColumn(2).width = 50;
    workSheet.getColumn(3).width = 25;

    ["A1", "B1", "C1"].forEach((cellRef) => {
      const cell = workSheet.getCell(cellRef);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { bold: true, size: 14 };
    });

    for (let i = 0; i < voters.length; i++) {
      const row = i + 2;
      workSheet.getCell(`A${row}`).value = voters[i].voterId;
      workSheet.getCell(`B${row}`).value = voters[i].name;
      workSheet.getCell(`C${row}`).value = voters[i].precinct;

      [`A${row}`, `B${row}`, `C${row}`].forEach((cellRef) => {
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
