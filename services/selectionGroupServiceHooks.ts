// services/selectionGroupServiceHooks.ts
/**
 * API‑wrapper for the Selection‑Group feature.
 *  – GET  /api/selectionGroups?projectPath=<abs>
 *  – POST /api/selectionGroups?projectPath=<abs>   { groups: { … } }
 */
import { useCallback } from 'react';
// import { fetchApi } from './apiService';
import { unifiedService as ipcService } from './unifiedService';
import { useSelectionGroupStore } from '@/stores/useSelectionGroupStore';
import { useAppStore } from '@/stores/useAppStore';

export function useSelectionGroupService() {
  const { setGroupsForProject, listGroups } = useSelectionGroupStore();
  const setError = useAppStore(s => s.setError);

  /* pull groups from backend → store + localStorage */
  const loadGroups = useCallback(
    async (projectPath: string) => {
      if (!projectPath) return;
      // TODO: Implement selection groups in IPC handler
      // const res = await fetchApi<Record<string, string[]>>(
      //   `/api/selectionGroups?projectPath=${encodeURIComponent(projectPath)}`,
      // );
      const res = null; // Temporarily disabled - not implemented in IPC yet
      if (res) {
        setGroupsForProject(projectPath, res);
      }
    },
    [setGroupsForProject],
  );

  /* push current project’s groups to backend */
  const saveGroups = useCallback(
    async (projectPath: string) => {
      if (!projectPath) {
        setError('Project path missing – cannot persist selection groups.');
        return false;
      }
      const groups = listGroups(projectPath);
      // TODO: Implement selection groups save in IPC handler
      // const ok = await fetchApi<Record<string, string[]>>(
      //   `/api/selectionGroups?projectPath=${encodeURIComponent(projectPath)}`,
      //   { method: 'POST', body: JSON.stringify({ groups }) },
      // );
      const ok = null; // Temporarily disabled - not implemented in IPC yet
      return !!ok;
    },
    [listGroups, setError],
  );

  return { loadGroups, saveGroups };
}
