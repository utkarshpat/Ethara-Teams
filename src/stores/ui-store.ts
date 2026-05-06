import { create } from "zustand";

type UiState = {
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
}));
