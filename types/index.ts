// types/index.ts

// Shared / re‑exported project types – EXTENDED with Codemap + Auto‑select models.
import { z } from 'zod';

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
export type TodoFilter   = 'all' | 'active' | 'completed';
export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt?: string;
}

/* ═══════════════ Codemap models ═══════════════ */
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

/* ═══════════════ Auto‑select models ═══════════════ */
export interface AutoSelectRequest {
  projectPath: string;
  instructions: string;
  treePaths: string[];               // flattened *relative* paths
}

export type AutoSelectResponse = string[];            // list of *relative* paths

/* █████  KANBAN  ██████████████████████████████████████████████████████ */
export const KanbanStatusValues   = ['todo', 'in-progress', 'done'] as const;
export const KanbanPriorityValues = ['low', 'medium', 'high']       as const;

export type KanbanStatus   = typeof KanbanStatusValues[number];
export type KanbanPriority = typeof KanbanPriorityValues[number];

export interface KanbanItem {
  id:          number;
  title:       string;
  details?:    string | null; // CHANGED from description, made nullable
  status:      KanbanStatus;
  priority:    KanbanPriority;
  dueDate?:    string | null; // CHANGED from deadline, made nullable (ISO Date string)
  createdAt:   string;        // ISO Date string
}

/* ----------  Runtime schema (shared FE/BE)  ------------------------- */
export const KanbanItemSchema = z.object({
  id:          z.number().int().nonnegative(),
  title:       z.string().min(1).max(120),
  details:     z.string().optional().nullable(), // CHANGED from description
  status:      z.enum(KanbanStatusValues),
  priority:    z.enum(KanbanPriorityValues),
  // Ensure dueDate and createdAt handle full ISO strings with timezone offset (e.g., "Z" for UTC)
  dueDate:     z.string().datetime({ offset: true }).optional().nullable(), // CHANGED from deadline
  createdAt:   z.string().datetime({ offset: true }),
});