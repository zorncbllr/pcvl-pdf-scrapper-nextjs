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
  openPath: (filePath: string) => Promise<{ success: boolean; msg: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
