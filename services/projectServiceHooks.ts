// services/projectServiceHooks.ts
/**
 * Single source of truth for
 *  • loading the project tree  ➜  GET /api/projects/tree
 *  • loading selected file contents ➜ POST /api/projects/files
 *
 * Uses central `fetchApi` which already handles global errors.
 * All state lives in zustand stores – the hook merely orchestrates IO.
 */

import { useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAppStore }    from '@/stores/useAppStore';
import { fetchApi }       from './apiService';
import type { FileNode, FileData } from '@/types';

export function useProjectService() {
  const st          = useProjectStore;
  const setError    = useAppStore((s) => s.setError);

  /* ─────────────────── tree ─────────────────── */
  const loadProjectTree = useCallback(async () => {
    const path = st.getState().projectPath;
    if (!path) return;

    st.getState().setIsLoadingTree(true);
    const tree = await fetchApi<FileNode[]>(
      `/api/projects/tree?rootDir=${encodeURIComponent(path)}`,
    );
    st.getState().setIsLoadingTree(false);

    st.getState().setFileTree(tree ?? []);   // always return array
  }, []);

  /* ─────────────────── file contents ─────────────────── */
  const loadSelectedFileContents = useCallback(async () => {
    const { projectPath, selectedFilePaths } = st.getState();
    if (!projectPath || selectedFilePaths.length === 0) {
      st.getState().setFilesData([]);
      return;
    }

    // directories end with '/' (convention from backend); skip those
    const files = selectedFilePaths.filter((p) => !p.endsWith('/'));
    if (files.length === 0) {
      st.getState().setFilesData([]);
      return;
    }

    st.getState().setIsLoadingContents(true);
    const res = await fetchApi<FileData[]>('/api/projects/files', {
      method: 'POST',
      body: JSON.stringify({ baseDir: projectPath, paths: files }),
    });
    st.getState().setIsLoadingContents(false);

    if (!res) return;          // error already handled by fetchApi
    st.getState().setFilesData(res);
  }, []);

  return { loadProjectTree, loadSelectedFileContents };
}
