// File: stores/useProjectStore.ts
// NEW FILE
import { create } from 'zustand';
import { FileNode } from '@/lib/fileFilters'; // Assuming FileNode is defined here or elsewhere

interface FileData {
  path: string;
  content: string;
  tokenCount: number;
}

interface ProjectState {
  projectPath: string;
  setProjectPath: (path: string) => void;
  fileTree: FileNode[];
  setFileTree: (tree: FileNode[]) => void;
  selectedFilePaths: string[]; // Use paths for simplicity
  setSelectedFilePaths: (paths: string[]) => void;
  toggleFilePathSelection: (path: string, isSelected: boolean, descendants: string[]) => void; // Helper for tree view
  selectAllFiles: (allPaths: string[], localExclusions: Set<string>) => void;
  deselectAllFiles: () => void;
  filesData: FileData[];
  setFilesData: (data: FileData[]) => void;
  addFilesData: (data: FileData[]) => void; // For incremental loading?
  isLoadingTree: boolean;
  setIsLoadingTree: (loading: boolean) => void;
  isLoadingContents: boolean;
  setIsLoadingContents: (loading: boolean) => void;
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: '',
  setProjectPath: (path) => {
      set({ projectPath: path, selectedFilePaths: [], filesData: [], fileTree: [], fileSearchTerm: '' }); // Reset related state on path change
      // Persist project path
      if (typeof window !== 'undefined') {
          localStorage.setItem("lastProjectPath", path);
      }
  },
  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  selectedFilePaths: [],
  setSelectedFilePaths: (paths) => set({ selectedFilePaths: paths }),
  toggleFilePathSelection: (path, isSelected, descendants) => {
      const currentSelection = new Set(get().selectedFilePaths);
      if (isSelected) {
          descendants.forEach(p => currentSelection.add(p));
      } else {
          descendants.forEach(p => currentSelection.delete(p));
      }
      set({ selectedFilePaths: Array.from(currentSelection) });
  },
  selectAllFiles: (allPaths, localExclusionsSet) => {
      const filesToSelect = allPaths.filter(p => !localExclusionsSet.has(p));
      set({ selectedFilePaths: filesToSelect });
  },
  deselectAllFiles: () => set({ selectedFilePaths: [], filesData: [] }), // Also clear file data
  filesData: [],
  setFilesData: (data) => set({ filesData: data }),
  addFilesData: (data) => set((state) => ({ filesData: [...state.filesData, ...data] })),
  isLoadingTree: false,
  setIsLoadingTree: (loading) => set({ isLoadingTree: loading }),
  isLoadingContents: false,
  setIsLoadingContents: (loading) => set({ isLoadingContents: loading }),
  fileSearchTerm: '',
  setFileSearchTerm: (term: string) => set({ fileSearchTerm: term }),
}));

// Load initial project path from localStorage
if (typeof window !== 'undefined') {
    const storedPath = localStorage.getItem("lastProjectPath") || "";
    if (storedPath) {
        useProjectStore.setState({ projectPath: storedPath });
    }
}
