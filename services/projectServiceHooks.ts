// File: services/projectServiceHooks.ts
// FULL FILE – Correction applied
import { useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { unifiedService as ipcService } from './unifiedService';
import type { FileNode, FileData } from '@/types';

/* ───────── helper ────────── */
const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const S = new Set(a);
  return b.every(p => S.has(p));
};

export function useProjectService() {
  const st = useProjectStore; // stable reference

  /* ─────── tree ─────── */
  const loadProjectTree = useCallback(async () => {
    const path = st.getState().projectPath;
    if (!path) return;

    st.getState().setIsLoadingTree(true);
    const tree = await ipcService.project.getTree(path);
    st.getState().setIsLoadingTree(false);
    st.getState().setFileTree(tree ?? []);
  }, [st]); // Dependency on stable store reference

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
    const res = await ipcService.project.getFiles(projectPath, pathsToFetch);
    st.getState().setIsLoadingContents(false);
    if (!res) return; // error already surfaced

    /* 🔎 Keep only non‑empty files and update the filesData store */
    const valid = res.filter(f => (f.tokenCount ?? 0) > 0);
    st.getState().setFilesData(valid);

    /*
     * 🛑 FIX: REMOVED THE BLOCK BELOW TO PREVENT INFINITE LOOP
     * Loading content should not implicitly change the selection.
     * The selection should only change via user interaction or explicit features (like auto-select).
     */
    // const keep = valid.map(f => f.path);
    // if (!sameSet(keep, selectedFilePaths)) {
    //   st.getState().setSelectedFilePaths(keep); // <-- THIS CAUSED THE LOOP
    // }

  }, [st]); // Dependency on stable store reference

  return { loadProjectTree, loadSelectedFileContents };
}