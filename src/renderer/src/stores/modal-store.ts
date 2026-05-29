import { create } from "zustand";
import type { Voter } from "@/types/electron";

interface ModalStore {
  openClear: boolean;
  openForm: boolean;
  openEdit: boolean;
  openDelete: boolean;
  editingVoter: Voter | null;
  deletingVoter: Voter | null;

  setOpenForm: (openForm: boolean) => void;
  setOpenClear: (openClear: boolean) => void;
  setEditVoter: (voter: Voter | null) => void;
  setDeleteVoter: (voter: Voter | null) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  openClear: false,
  openForm: false,
  openEdit: false,
  openDelete: false,
  editingVoter: null,
  deletingVoter: null,

  setOpenForm: (openForm: boolean) => set(() => ({ openForm })),
  setOpenClear: (openClear) => set(() => ({ openClear })),
  setEditVoter: (voter) =>
    set(() => ({ editingVoter: voter, openEdit: !!voter })),
  setDeleteVoter: (voter) =>
    set(() => ({ deletingVoter: voter, openDelete: !!voter })),
}));
