import { contextBridge, ipcRenderer } from "electron";

const api = {
  getVoters: () => ipcRenderer.invoke("voters:get-all"),
  getBarangayPrecincts: () =>
    ipcRenderer.invoke("barangay-precincts:get-all"),
  importPDF: () => ipcRenderer.invoke("voters:import-pdf"),
  exportExcel: (data?: { onlySelected?: boolean }) =>
    ipcRenderer.invoke("voters:export-excel", data),
  addVoter: (data: { name: string; precinct: string; barangay?: string }) =>
    ipcRenderer.invoke("voters:add", data),
  clearVoters: () => ipcRenderer.invoke("voters:clear"),
  updateStatus: (data: { voterId: number; value: boolean }) =>
    ipcRenderer.invoke("voters:update-status", data),
  updateAllStatus: (data: { voterIds: number[]; value: boolean }) =>
    ipcRenderer.invoke("voters:update-all-status", data),
  updateVoter: (data: { voterId: number; name: string; precinct: string; barangay?: string }) =>
    ipcRenderer.invoke("voters:update", data),
  deleteVoter: (data: { voterId: number }) =>
    ipcRenderer.invoke("voters:delete", data),
  readExcel: (data: number[]) =>
    ipcRenderer.invoke("voters:read-excel", data),
  readExcelSheet: (payload: { data: number[]; sheetName: string }) =>
    ipcRenderer.invoke("voters:read-excel-sheet", payload),
  openPath: (filePath: string) =>
    ipcRenderer.invoke("shell:open-path", filePath),
  getPairs: () => ipcRenderer.invoke("pairs:get-all"),
  savePair: (data: { voterId: number; excelRowId: number }) =>
    ipcRenderer.invoke("pairs:save", data),
  clearPairs: () => ipcRenderer.invoke("pairs:clear"),
  saveExcelFile: (data: {
    buffer: number[];
    fileName: string;
    sheets: string[];
    activeSheet: string;
  }) => ipcRenderer.invoke("excel-file:save", data),
  loadExcelFile: () => ipcRenderer.invoke("excel-file:load"),
  deleteExcelFile: () => ipcRenderer.invoke("excel-file:delete"),
};

contextBridge.exposeInMainWorld("electronAPI", api);
