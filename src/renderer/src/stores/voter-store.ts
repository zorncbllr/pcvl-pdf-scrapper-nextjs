import { create } from "zustand";
import type { Voter } from "../types/electron";

interface VoterStore {
  voters: Voter[];
  loading: boolean;
  fetchVoters: () => Promise<void>;
}

export const useVoterStore = create<VoterStore>((set) => ({
  voters: [],
  loading: true,
  fetchVoters: async () => {
    set({ loading: true });
    const voters = await window.electronAPI.getVoters();
    set({ voters, loading: false });
  },
}));
