export interface Voter {
  voterId: number;
  name: string;
  precinct: string;
  barangay: string;
  isGiven: boolean;
}

export interface ElectronAPI {
  getVoters: () => Promise<Voter[]>;
  getBarangayPrecincts: () => Promise<
    { precinct: string; barangay: string }[]
  >;
  importPDF: () => Promise<{ msg: string; success: boolean }>;
  exportExcel: (data?: {
    onlySelected?: boolean;
  }) => Promise<{ msg: string; success: boolean; filePath?: string }>;
  addVoter: (data: {
    name: string;
    precinct: string;
    barangay?: string;
  }) => Promise<{ msg: string; success: boolean }>;
  clearVoters: () => Promise<{ msg: string; success: boolean }>;
  updateStatus: (data: {
    voterId: number;
    value: boolean;
  }) => Promise<{ success: boolean }>;
  updateAllStatus: (data: {
    voterIds: number[];
    value: boolean;
  }) => Promise<{ success: boolean }>;
  updateVoter: (data: {
    voterId: number;
    name: string;
    precinct: string;
    barangay?: string;
  }) => Promise<{ msg: string; success: boolean }>;
  deleteVoter: (data: {
    voterId: number;
  }) => Promise<{ msg: string; success: boolean }>;
  readExcel: (data: number[]) => Promise<{ sheets: string[] }>;
  readExcelSheet: (payload: {
    data: number[];
    sheetName: string;
  }) => Promise<{
    headers: string[];
    rows: string[][];
    rowIds: number[];
    merges: { row: number; col: number; rowspan: number; colspan: number }[];
  }>;
  openPath: (filePath: string) => Promise<{ success: boolean; msg: string }>;
  getPairs: () => Promise<{ voterId: number; excelRowId: number }[]>;
  savePair: (data: {
    voterId: number;
    excelRowId: number;
  }) => Promise<void>;
  clearPairs: () => Promise<void>;
  saveExcelFile: (data: {
    buffer: number[];
    fileName: string;
    sheets: string[];
    activeSheet: string;
  }) => Promise<void>;
  loadExcelFile: () => Promise<{
    buffer: number[];
    fileName: string;
    sheets: string[];
    activeSheet: string;
  } | null>;
  deleteExcelFile: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
