// File: stores/useProjectStore.ts
import { create } from "zustand";
import { FileNode } from "@/lib/fileFilters";

/* ──────────────────────────────────────────────────────────── *
 *                        Helpers                               *
 * ──────────────────────────────────────────────────────────── */

/** Set‐eşitliği (sıra gözetmez) */
const sameSet = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const S = new Set(a);
  return b.every((p) => S.has(p));
};

/** Sıralı & sığ eşitlik (referans veya ===) */
const arraysShallowEqual = <T>(a: T[], b: T[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

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

  /** bulk‑select honouring exclusions */
  selectAllFiles(
    allPaths: string[],
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
    set({
      projectPath: path,
      selectedFilePaths: [],
      filesData: [],
      fileTree: [],
      fileSearchTerm: "",
    });
    if (typeof window !== "undefined")
      localStorage.setItem("lastProjectPath", path);
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
    if (sameSet(paths, get().selectedFilePaths)) return; // identical
    set({ selectedFilePaths: paths });
  },

  toggleFilePathSelection: (path, isSel, descendants) => {
    const cur = new Set(get().selectedFilePaths);
    (isSel ? descendants : []).forEach((p) => cur.add(p));
    (!isSel ? descendants : []).forEach((p) => cur.delete(p));
    const next = Array.from(cur);
    if (!sameSet(next, get().selectedFilePaths)) {
      set({ selectedFilePaths: next });
    }
  },

  /** honours global & local exclusions */
  selectAllFiles: (all, gSet, lSet) => {
    const files = all.filter((p) => !gSet.has(p) && !lSet.has(p));
    if (sameSet(files, get().selectedFilePaths)) return;
    set({ selectedFilePaths: files });
  },

  deselectAllFiles: () => {
    if (get().selectedFilePaths.length === 0 && get().filesData.length === 0)
      return;
    set({ selectedFilePaths: [], filesData: [] });
  },

  /* ───── file contents ───── */
  filesData: [],
  setFilesData: (data) => {
    // hızlı kontrol: aynı referans veya aynı uzunluk & her path eşleşiyor
    const prev = get().filesData;
    const eq =
      prev === data ||
      (prev.length === data.length &&
        prev.every((f, i) => f.path === data[i].path && f.tokenCount === data[i].tokenCount));
    if (eq) return;
    set({ filesData: data });
  },

  addFilesData: (data) =>
    set((state) => ({ filesData: [...state.filesData, ...data] })),

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
