// types/index.ts
// Shared / re‑exported project types – EXTENDED with Codemap models.

export interface FileNode {
  name: string;
  relativePath: string;
  absolutePath: string;
  type: "file" | "directory";
  children?: FileNode[];
}

/* — project file‑content payload — */
export interface FileData {
  path: string;
  content: string;
  tokenCount: number;
}

/* — todo items — */
export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt?: string;
}

/* ═════════════════ Codemap models ═════════════════ */
export interface CodemapRequest {
  baseDir: string;
  paths: string[];             // *relative* paths
}

export interface CodemapInfo {
  classes: string[];
  functions: string[];
  references: string[];
  /** Populated when the backend failed for this file */
  error?: string;
  /** true ⇢ binary file, extraction skipped */
  binary?: boolean;
}

export type CodemapResponse = Record<string, CodemapInfo>;
