// services/projectServiceHooks.ts
/**
 * Authoritative loader for:
 *   • project tree  (GET /projects/tree)
 *   • file contents (POST /projects/files)
 *
 * Now avoids an infinite refresh loop by only
 * updating selectedFilePaths *iff* the list
 * actually changed.
 */

import { useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { fetchApi } from './apiService';
import type { FileNode, FileData } from '@/types';

/* ───────── helper ────────── */
const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const S = new Set(a);
  return b.every(p => S.has(p));
};

export function useProjectService() {
  const st = useProjectStore; // ✅ stable reference, but included in deps for eslint

  /* ─────── tree ─────── */
  const loadProjectTree = useCallback(async () => {
    const path = st.getState().projectPath;
    if (!path) return;

    st.getState().setIsLoadingTree(true);
    const tree = await fetchApi<FileNode[]>(
      `/api/projects/tree?rootDir=${encodeURIComponent(path)}`,
    );
    st.getState().setIsLoadingTree(false);
    st.getState().setFileTree(tree ?? []);
  }, [st]);          // 🟢 added `st` to dependency array

  /* ─── selected file‑contents ─── */
  const loadSelectedFileContents = useCallback(async () => {
    const { projectPath, selectedFilePaths } = st.getState();
    if (!projectPath || selectedFilePaths.length === 0) {
      st.getState().setFilesData([]);
      return;
    }

    /* strip dir placeholders (end with “/”) */
    const pathsToFetch = selectedFilePaths.filter(p => !p.endsWith('/'));
    if (pathsToFetch.length === 0) {
      st.getState().setFilesData([]);
      return;
    }

    st.getState().setIsLoadingContents(true);
    const res = await fetchApi<FileData[]>('/api/projects/files', {
      method: 'POST',
      body : JSON.stringify({ baseDir: projectPath, paths: pathsToFetch }),
    });
    st.getState().setIsLoadingContents(false);
    if (!res) return;                          // error already surfaced

    /* 🔎 Keep only non‑empty files */
    const valid = res.filter(f => (f.tokenCount ?? 0) > 0);
    st.getState().setFilesData(valid);

    /* 🛑 Update selection only if it truly differs */
    const keep = valid.map(f => f.path);
    if (!sameSet(keep, selectedFilePaths)) {
      st.getState().setSelectedFilePaths(keep);
    }
  }, [st]);          // 🟢 added `st` to dependency array

  return { loadProjectTree, loadSelectedFileContents };
}
