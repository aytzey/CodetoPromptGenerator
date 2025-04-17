// File: stores/usePromptStore.ts
// NEW FILE
import { create } from 'zustand';

interface PromptState {
  metaPrompt: string;
  setMetaPrompt: (prompt: string) => void;
  mainInstructions: string;
  setMainInstructions: (instructions: string) => void;
  metaPromptFiles: string[]; // List of saved file names
  setMetaPromptFiles: (files: string[]) => void;
  selectedMetaFile: string; // Currently selected filename for loading/saving
  setSelectedMetaFile: (filename: string) => void;
  newMetaFileName: string; // Input for saving a new file
  setNewMetaFileName: (filename: string) => void;
  isLoadingMetaList: boolean;
  setIsLoadingMetaList: (loading: boolean) => void;
  isLoadingMetaContent: boolean;
  setIsLoadingMetaContent: (loading: boolean) => void;
  isSavingMeta: boolean;
  setIsSavingMeta: (saving: boolean) => void;
}

export const usePromptStore = create<PromptState>((set) => ({
  metaPrompt: '',
  setMetaPrompt: (prompt) => set({ metaPrompt: prompt }),
  mainInstructions: '',
  setMainInstructions: (instructions) => set({ mainInstructions: instructions }),
  metaPromptFiles: [],
  setMetaPromptFiles: (files) => set({ metaPromptFiles: files }),
  selectedMetaFile: '',
  setSelectedMetaFile: (filename) => set({ selectedMetaFile: filename }),
  newMetaFileName: '',
  setNewMetaFileName: (filename) => set({ newMetaFileName: filename }),
  isLoadingMetaList: false,
  setIsLoadingMetaList: (loading) => set({ isLoadingMetaList: loading }),
  isLoadingMetaContent: false,
  setIsLoadingMetaContent: (loading) => set({ isLoadingMetaContent: loading }),
  isSavingMeta: false,
  setIsSavingMeta: (saving) => set({ isSavingMeta: saving }),
}));
