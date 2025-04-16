// File: stores/useProjectStore.ts
import { create } from 'zustand';
import { FileNode } from '@/lib/fileFilters';   // reused type

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

  /** selected *relative* paths (file and dir) */
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  toggleFilePathSelection: (
    path: string,
    isSelected: boolean,
    descendants: string[]
  ) => void;

  /**
   * Add *all* `allPaths`, skipping anything present in either
   * `globalExclusions` or `localExclusions`
   */
  selectAllFiles: (
    allPaths: string[],
    globalExclusions: Set<string>,
    localExclusions: Set<string>
  ) => void;

  deselectAllFiles: () => void;

  /** fetched file‑contents */
  filesData: FileData[];
  setFilesData: (data: FileData[]) => void;
  addFilesData: (data: FileData[]) => void;

  isLoadingTree: boolean;
  setIsLoadingTree: (loading: boolean) => void;
  isLoadingContents: boolean;
  setIsLoadingContents: (loading: boolean) => void;

  /** UI helpers */
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: '',
  setProjectPath: path => {
    set({
      projectPath: path,
      selectedFilePaths: [],
      filesData: [],
      fileTree: [],
      fileSearchTerm: '',
    });
    if (typeof window !== 'undefined')
      localStorage.setItem('lastProjectPath', path);
  },

  fileTree: [],
  setFileTree: tree => set({ fileTree: tree }),

  selectedFilePaths: [],
  setSelectedFilePaths: paths => set({ selectedFilePaths: paths }),

  toggleFilePathSelection: (path, isSel, descendants) => {
    const cur = new Set(get().selectedFilePaths);
    (isSel ? descendants : []).forEach(p => cur.add(p));
    (!isSel ? descendants : []).forEach(p => cur.delete(p));
    set({ selectedFilePaths: Array.from(cur) });
  },

  /** NEW – honours *both* global & local exclusion sets */
  selectAllFiles: (all, gSet, lSet) => {
    const files = all.filter(p => !gSet.has(p) && !lSet.has(p));
    set({ selectedFilePaths: files });
  },

  deselectAllFiles: () => set({ selectedFilePaths: [], filesData: [] }),

  filesData: [],
  setFilesData: data => set({ filesData: data }),
  addFilesData: data =>
    set(state => ({ filesData: [...state.filesData, ...data] })),

  isLoadingTree: false,
  setIsLoadingTree: loading => set({ isLoadingTree: loading }),
  isLoadingContents: false,
  setIsLoadingContents: loading => set({ isLoadingContents: loading }),

  fileSearchTerm: '',
  setFileSearchTerm: term => set({ fileSearchTerm: term }),
}));

/* restore persisted project path (once) */
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('lastProjectPath') || '';
  if (stored) useProjectStore.setState({ projectPath: stored });
}
