import { contextBridge, ipcRenderer } from "electron";

const api = {
  getVoters: () => ipcRenderer.invoke("voters:get-all"),
  importPDF: () => ipcRenderer.invoke("voters:import-pdf"),
  exportExcel: (data?: { onlySelected?: boolean }) =>
    ipcRenderer.invoke("voters:export-excel", data),
  addVoter: (data: { name: string; precinct: string }) =>
    ipcRenderer.invoke("voters:add", data),
  clearVoters: () => ipcRenderer.invoke("voters:clear"),
  updateStatus: (data: { voterId: number; value: boolean }) =>
    ipcRenderer.invoke("voters:update-status", data),
  updateVoter: (data: { voterId: number; name: string; precinct: string }) =>
    ipcRenderer.invoke("voters:update", data),
  deleteVoter: (data: { voterId: number }) =>
    ipcRenderer.invoke("voters:delete", data),
  openPath: (filePath: string) =>
    ipcRenderer.invoke("shell:open-path", filePath),
};

contextBridge.exposeInMainWorld("electronAPI", api);
