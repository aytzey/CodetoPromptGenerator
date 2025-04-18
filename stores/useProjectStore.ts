// FILE: stores/useProjectStore.ts
import { create } from "zustand";
import { FileNode } from "@/lib/fileFilters"; // Assuming FileNode is defined here or in types

/* ──────────────────────────────────────────────────────────── *
 *                        Helpers                               *
 * ──────────────────────────────────────────────────────────── */

/** Set equality (order-independent) */
const sameSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const S = new Set(a);
  return b.every((p) => S.has(p));
};

/** Shallow array equality (reference or ===) */
const arraysShallowEqual = <T>(a: T[], b: T[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Checks if a file path matches any exclusion pattern.
 * Handles direct matches and *.ext wildcards.
 */
const isExcluded = (filePath: string, exclusionPatterns: Set<string>): boolean => {
  if (exclusionPatterns.has(filePath)) {
    return true; // Direct match
  }
  // Check wildcard patterns (*.ext)
  for (const pattern of exclusionPatterns) {
    if (pattern.startsWith('*.')) {
      const extension = pattern.substring(1); // Includes the dot, e.g., ".log"
      if (filePath.toLowerCase().endsWith(extension.toLowerCase())) {
        return true;
      }
    }
    // Add other pattern types here if needed (e.g., dir/**)
    // For now, only handle direct match and *.ext
  }
  return false;
};


/* ──────────────────────────────────────────────────────────── *
 *                        Types                                 *
 * ──────────────────────────────────────────────────────────── */

export interface FileData {
  path: string;
  content: string;
  tokenCount: number;
}

interface ProjectState {
  /* core */
  projectPath: string;
  setProjectPath(path: string): void;

  fileTree: FileNode[];
  setFileTree(tree: FileNode[]): void;

  /** selected *relative* paths (file and dir) */
  selectedFilePaths: string[];
  setSelectedFilePaths(paths: string[]): void;
  toggleFilePathSelection(
    path: string,
    isSelected: boolean,
    descendants: string[]
  ): void;

  /** bulk‑select honouring exclusions (including *.ext) */
  selectAllFiles(
    allPaths: string[], // Should be file paths only for selection
    globalExclusions: Set<string>,
    localExclusions: Set<string>
  ): void;
  deselectAllFiles(): void;

  /* loaded contents */
  filesData: FileData[];
  setFilesData(data: FileData[]): void;
  addFilesData(data: FileData[]): void;

  /* flags */
  isLoadingTree: boolean;
  setIsLoadingTree(loading: boolean): void;
  isLoadingContents: boolean;
  setIsLoadingContents(loading: boolean): void;

  /* UI helpers */
  fileSearchTerm: string;
  setFileSearchTerm(term: string): void;
}

/* ──────────────────────────────────────────────────────────── *
 *                        Store                                 *
 * ──────────────────────────────────────────────────────────── */

export const useProjectStore = create<ProjectState>((set, get) => ({
  /* ───── basic path ───── */
  projectPath: "",
  setProjectPath: (path) => {
    const normalizedPath = path.replace(/\\/g, '/'); // Normalize slashes
    set({
      projectPath: normalizedPath,
      selectedFilePaths: [],
      filesData: [],
      fileTree: [],
      fileSearchTerm: "",
    });
    if (typeof window !== "undefined")
      localStorage.setItem("lastProjectPath", normalizedPath);
  },

  /* ───── tree ───── */
  fileTree: [],
  setFileTree: (tree) => {
    if (arraysShallowEqual(tree, get().fileTree)) return; // no change
    set({ fileTree: tree });
  },

  /* ───── selection ───── */
  selectedFilePaths: [],
  setSelectedFilePaths: (paths) => {
    const normalizedPaths = paths.map(p => p.replace(/\\/g, '/')); // Normalize slashes
    if (sameSet(normalizedPaths, get().selectedFilePaths)) return; // identical
    set({ selectedFilePaths: normalizedPaths });
  },

  toggleFilePathSelection: (path, isSel, descendants) => {
    const normalizedPath = path.replace(/\\/g, '/');
    const normalizedDescendants = descendants.map(d => d.replace(/\\/g, '/'));
    const cur = new Set(get().selectedFilePaths);

    // If selecting, add the path itself (if it's a file) and all descendants
    // If deselecting, remove the path itself and all descendants
    const pathsToModify = [normalizedPath, ...normalizedDescendants];

    pathsToModify.forEach((p) => {
        if (isSel) {
            cur.add(p);
        } else {
            cur.delete(p);
        }
    });

    const next = Array.from(cur);
    if (!sameSet(next, get().selectedFilePaths)) {
      set({ selectedFilePaths: next });
    }
  },

  /** honours global & local exclusions, including *.ext patterns */
  selectAllFiles: (allFilePaths, gSet, lSet) => {
    const combinedExclusions = new Set([...gSet, ...lSet]);
    // Filter the provided file paths based on the combined exclusions
    const filesToSelect = allFilePaths.filter(
      (filePath) => !isExcluded(filePath, combinedExclusions)
    );

    const normalizedFilesToSelect = filesToSelect.map(p => p.replace(/\\/g, '/'));

    if (sameSet(normalizedFilesToSelect, get().selectedFilePaths)) return;
    set({ selectedFilePaths: normalizedFilesToSelect });
  },

  deselectAllFiles: () => {
    if (get().selectedFilePaths.length === 0 && get().filesData.length === 0)
      return;
    set({ selectedFilePaths: [], filesData: [] });
  },

  /* ───── file contents ───── */
  filesData: [],
  setFilesData: (data) => {
    const normalizedData = data.map(f => ({ ...f, path: f.path.replace(/\\/g, '/') }));
    const prev = get().filesData;
    const eq =
      prev === normalizedData ||
      (prev.length === normalizedData.length &&
        prev.every((f, i) => f.path === normalizedData[i].path && f.tokenCount === normalizedData[i].tokenCount));
    if (eq) return;
    set({ filesData: normalizedData });
  },

  addFilesData: (data) => {
     const normalizedData = data.map(f => ({ ...f, path: f.path.replace(/\\/g, '/') }));
     set((state) => ({ filesData: [...state.filesData, ...normalizedData] }));
  },


  /* ───── flags ───── */
  isLoadingTree: false,
  setIsLoadingTree: (loading) => {
    if (loading === get().isLoadingTree) return;
    set({ isLoadingTree: loading });
  },

  isLoadingContents: false,
  setIsLoadingContents: (loading) => {
    if (loading === get().isLoadingContents) return;
    set({ isLoadingContents: loading });
  },

  /* ───── ui helpers ───── */
  fileSearchTerm: "",
  setFileSearchTerm: (term) => {
    if (term === get().fileSearchTerm) return;
    set({ fileSearchTerm: term });
  },
}));

/* ─────────────── restore persisted project path (once) ─────────────── */
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("lastProjectPath") || "";
  if (stored) useProjectStore.setState({ projectPath: stored });
}