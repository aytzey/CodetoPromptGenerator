import { create } from "zustand";

export type SelectionGroupMap = Record<string, string[]>;
export type SelectionGroupsByProject = Record<string, SelectionGroupMap>;

const normalizePaths = (paths: string[]): string[] =>
  Array.from(
    new Set(
      paths
        .filter((p) => typeof p === "string" && p.trim().length > 0)
        .map((p) => p.replace(/\\/g, "/")),
    ),
  );

interface SelectionGroupState {
  groups: SelectionGroupsByProject;

  createGroup: (projectPath: string, group: string, paths: string[]) => void;
  deleteGroup: (projectPath: string, group: string) => void;
  renameGroup: (projectPath: string, oldName: string, newName: string) => void;
  listGroups: (projectPath: string) => SelectionGroupMap;
  setGroupsForProject: (projectPath: string, groups: SelectionGroupMap) => void;
  clearProjectGroups: (projectPath: string) => void;
}

export const useSelectionGroupStore = create<SelectionGroupState>((set, get) => ({
  groups: {},

  createGroup: (projectPath, group, paths) =>
    set((state) => {
      const key = projectPath.trim();
      const groupName = group.trim();
      if (!key || !groupName) return state;

      return {
        groups: {
          ...state.groups,
          [key]: {
            ...(state.groups[key] ?? {}),
            [groupName]: normalizePaths(paths),
          },
        },
      };
    }),

  deleteGroup: (projectPath, group) =>
    set((state) => {
      const key = projectPath.trim();
      const groupName = group.trim();
      if (!key || !groupName || !state.groups[key]?.[groupName]) return state;

      const nextProjectGroups = { ...state.groups[key] };
      delete nextProjectGroups[groupName];

      return {
        groups: {
          ...state.groups,
          [key]: nextProjectGroups,
        },
      };
    }),

  renameGroup: (projectPath, oldName, newName) =>
    set((state) => {
      const key = projectPath.trim();
      const oldKey = oldName.trim();
      const newKey = newName.trim();
      const existing = state.groups[key]?.[oldKey];
      if (!key || !oldKey || !newKey || !existing) return state;

      const nextProjectGroups = { ...state.groups[key] };
      nextProjectGroups[newKey] = existing;
      if (newKey !== oldKey) {
        delete nextProjectGroups[oldKey];
      }

      return {
        groups: {
          ...state.groups,
          [key]: nextProjectGroups,
        },
      };
    }),

  listGroups: (projectPath) => get().groups[projectPath] ?? {},

  setGroupsForProject: (projectPath, groups) =>
    set((state) => {
      const key = projectPath.trim();
      if (!key) return state;

      const normalized: SelectionGroupMap = Object.fromEntries(
        Object.entries(groups ?? {}).map(([name, paths]) => [
          name,
          normalizePaths(Array.isArray(paths) ? paths : []),
        ]),
      );

      return {
        groups: {
          ...state.groups,
          [key]: normalized,
        },
      };
    }),

  clearProjectGroups: (projectPath) =>
    set((state) => {
      const key = projectPath.trim();
      if (!key || !state.groups[key]) return state;

      const next = { ...state.groups };
      delete next[key];
      return { groups: next };
    }),
}));
