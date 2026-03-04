import { useCallback } from "react";
import { fetchApi } from "./apiService";
import {
  useSelectionGroupStore,
  type SelectionGroupMap,
} from "@/stores/useSelectionGroupStore";
import { useAppStore } from "@/stores/useAppStore";

const LEGACY_LS_KEY = "ctpgSelectionGroups_v1";

type LegacyPersistedGroups = Record<string, SelectionGroupMap>;

const normalizeGroups = (value: unknown): SelectionGroupMap => {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>);
  const normalized: SelectionGroupMap = {};

  for (const [groupName, rawPaths] of entries) {
    if (!groupName.trim() || !Array.isArray(rawPaths)) continue;

    const paths = Array.from(
      new Set(
        rawPaths
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.replace(/\\/g, "/")),
      ),
    );
    normalized[groupName] = paths;
  }

  return normalized;
};

const readLegacyProjectGroups = (projectPath: string): SelectionGroupMap => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as LegacyPersistedGroups;
    return normalizeGroups(parsed?.[projectPath]);
  } catch {
    return {};
  }
};

const clearLegacyProjectGroups = (projectPath: string): void => {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as LegacyPersistedGroups;
    if (!parsed || typeof parsed !== "object" || !(projectPath in parsed)) return;

    delete parsed[projectPath];
    if (Object.keys(parsed).length === 0) {
      localStorage.removeItem(LEGACY_LS_KEY);
      return;
    }

    localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore legacy cleanup errors; migration should not block usage.
  }
};

export function useSelectionGroupService() {
  const { setGroupsForProject, listGroups } = useSelectionGroupStore();
  const setError = useAppStore((s) => s.setError);

  const loadGroups = useCallback(
    async (projectPath: string): Promise<SelectionGroupMap> => {
      if (!projectPath) return {};

      const res = await fetchApi<Record<string, unknown>>(
        `/api/selectionGroups?projectPath=${encodeURIComponent(projectPath)}`,
      );
      const groups = normalizeGroups(res);
      setGroupsForProject(projectPath, groups);
      return groups;
    },
    [setGroupsForProject],
  );

  const persistGroups = useCallback(
    async (projectPath: string, groups: SelectionGroupMap): Promise<boolean> => {
      if (!projectPath) {
        setError("Project path missing, selection groups could not be saved.");
        return false;
      }

      const payload = { groups: normalizeGroups(groups) };
      const res = await fetchApi<{ success: boolean }>(
        `/api/selectionGroups?projectPath=${encodeURIComponent(projectPath)}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      return !!res;
    },
    [setError],
  );

  const saveCurrentGroups = useCallback(
    async (projectPath: string): Promise<boolean> => {
      const groups = listGroups(projectPath);
      return persistGroups(projectPath, groups);
    },
    [listGroups, persistGroups],
  );

  const loadAndMigrateLegacyGroups = useCallback(
    async (projectPath: string): Promise<{ groups: SelectionGroupMap; migrated: boolean }> => {
      if (!projectPath) {
        return { groups: {}, migrated: false };
      }

      const backendGroups = await loadGroups(projectPath);
      if (Object.keys(backendGroups).length > 0) {
        clearLegacyProjectGroups(projectPath);
        return { groups: backendGroups, migrated: false };
      }

      const legacyGroups = readLegacyProjectGroups(projectPath);
      if (Object.keys(legacyGroups).length === 0) {
        return { groups: backendGroups, migrated: false };
      }

      const migrated = await persistGroups(projectPath, legacyGroups);
      if (!migrated) {
        return { groups: backendGroups, migrated: false };
      }

      setGroupsForProject(projectPath, legacyGroups);
      clearLegacyProjectGroups(projectPath);
      return { groups: legacyGroups, migrated: true };
    },
    [loadGroups, persistGroups, setGroupsForProject],
  );

  return {
    loadGroups,
    persistGroups,
    saveCurrentGroups,
    loadAndMigrateLegacyGroups,
  };
}
