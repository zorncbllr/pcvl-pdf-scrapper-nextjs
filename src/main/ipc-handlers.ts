import { ipcMain, dialog, shell, BrowserWindow } from "electron";
import * as voterService from "./services/voter-service";
import * as pdfService from "./services/pdf-service";
import * as excelService from "./services/excel-service";

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("voters:get-all", async () => {
    return voterService.getVoters();
  });

  ipcMain.handle("voters:import-pdf", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      properties: ["openFile"],
    });
    if (canceled || filePaths.length === 0) {
      return { success: false, msg: "Import cancelled." };
    }
    return pdfService.importPDF(filePaths[0]);
  });

  ipcMain.handle(
    "voters:export-excel",
    async (_, data?: { onlySelected?: boolean }) => {
      const onlySelected = data?.onlySelected ?? false;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: onlySelected ? "voters-selected.xlsx" : "voters.xlsx",
        filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
      });
      if (canceled || !filePath) {
        return { success: false, msg: "Export cancelled." };
      }
      return excelService.exportExcel(filePath, onlySelected);
    }
  );

  ipcMain.handle(
    "voters:add",
    async (_, data: { name: string; precinct: string }) => {
      return voterService.addVoter(data);
    }
  );

  ipcMain.handle("voters:clear", async () => {
    return voterService.clearVoters();
  });

  ipcMain.handle(
    "voters:update-status",
    async (_, data: { voterId: number; value: boolean }) => {
      return voterService.updateStatus(data);
    }
  );

  ipcMain.handle(
    "voters:update",
    async (_, data: { voterId: number; name: string; precinct: string }) => {
      return voterService.updateVoter(data);
    }
  );

  ipcMain.handle(
    "voters:delete",
    async (_, data: { voterId: number }) => {
      return voterService.deleteVoter(data);
    }
  );

  ipcMain.handle("shell:open-path", async (_, filePath: string) => {
    const error = await shell.openPath(filePath);
    return { success: error === "", msg: error };
  });
}
