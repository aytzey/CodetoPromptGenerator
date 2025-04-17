// stores/useSelectionGroupStore.ts
import { create } from 'zustand';

/** shape on disk / in the backend API */
export type PersistedGroups = Record<string, Record<string, string[]>>;

/* ────────── local‑storage helpers ────────── */
const LS_KEY = 'ctpgSelectionGroups_v1';
const readLS  = (): PersistedGroups =>
  JSON.parse(localStorage.getItem(LS_KEY) || '{}');
const writeLS = (d: PersistedGroups) =>
  localStorage.setItem(LS_KEY, JSON.stringify(d));

interface GroupState {
  /** every project’s groups */
  groups: PersistedGroups;

  /* CRUD helpers */
  saveGroup            :(projectPath: string, group: string, paths: string[]) => void;
  deleteGroup          :(projectPath: string, group: string)                => void;
  renameGroup          :(projectPath: string, oldName: string, newName: string) => void;
  listGroups           :(projectPath: string) => Record<string, string[]>;

  /** overwrite *all* groups for a project (used when loading from backend) */
  setGroupsForProject  :(projectPath: string, groups: Record<string, string[]>) => void;
}

/* ────────── store implementation ────────── */
export const useSelectionGroupStore = create<GroupState>((set, get) => ({
  /* init from localStorage (noop on server) */
  groups: typeof window === 'undefined' ? {} : readLS(),

  saveGroup: (projectPath, group, paths) =>
    set(state => {
      const next: PersistedGroups = { ...state.groups };
      next[projectPath] = { ...(next[projectPath] || {}), [group]: paths };
      writeLS(next);
      return { groups: next };
    }),

  deleteGroup: (projectPath, group) =>
    set(state => {
      const next = { ...state.groups };
      if (next[projectPath]) {
        delete next[projectPath][group];
        writeLS(next);
      }
      return { groups: next };
    }),

  renameGroup: (projectPath, oldName, newName) =>
    set(state => {
      const next = { ...state.groups };
      const proj = next[projectPath];
      if (proj?.[oldName]) {
        proj[newName] = proj[oldName];
        delete proj[oldName];
        writeLS(next);
      }
      return { groups: next };
    }),

  listGroups: projectPath => get().groups[projectPath] || {},

  /* replace whole set (used after GET /selectionGroups) */
  setGroupsForProject: (projectPath, groups) =>
    set(state => {
      const next = { ...state.groups, [projectPath]: groups };
      writeLS(next);
      return { groups: next };
    }),
}));
