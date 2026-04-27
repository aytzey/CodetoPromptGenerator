// File: services/exclusionServiceHooks.ts
// NEW FILE
import { useCallback } from 'react';
import { useExclusionStore } from '@/stores/useExclusionStore';
import { useProjectStore } from '@/stores/useProjectStore'; // To trigger tree reload
import { useAppStore } from '@/stores/useAppStore';
import type { ProjectIgnoreExclusion } from '@/types';
import { fetchApi } from './apiService';
import { useProjectService } from './projectServiceHooks'; // To get reload function

export function useExclusionService() {
    const {
        setGlobalExclusions, setIsLoadingGlobal, setIsSavingGlobal,
        setLocalExclusions, setIsLoadingLocal, setIsSavingLocal
    } = useExclusionStore();
    const { projectPath } = useProjectStore(); // Need project path for local exclusions
    const { loadProjectTree } = useProjectService(); // Need to reload tree after global changes
    const { setError } = useAppStore();

    // === Global Exclusions ===
    const fetchGlobalExclusions = useCallback(async () => {
        setIsLoadingGlobal(true);
        setError(null);
        try {
            const result = await fetchApi<string[]>(`/api/exclusions`);
            if (result !== null) {
                setGlobalExclusions(result);
            } else {
                setGlobalExclusions([]);
            }
        } finally {
            setIsLoadingGlobal(false);
        }
    }, [setIsLoadingGlobal, setGlobalExclusions, setError]);

    const updateGlobalExclusions = useCallback(async (exclusions: string[]) => {
        setIsSavingGlobal(true);
        setError(null);
        try {
            const result = await fetchApi<string[]>(`/api/exclusions`, {
                method: 'POST',
                body: JSON.stringify({ exclusions }),
            });
            if (result !== null) {
                setGlobalExclusions(result);
                // Refresh project tree as global exclusions changed
                if (projectPath) {
                    await loadProjectTree();
                }
            }
            // Return success status if needed by the component
            return result !== null;
        } finally {
            setIsSavingGlobal(false);
        }
    }, [setIsSavingGlobal, setGlobalExclusions, setError, projectPath, loadProjectTree]);

    // === Local Exclusions ===
    const fetchLocalExclusions = useCallback(async () => {
        // Get latest project path from store
        const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
             setLocalExclusions([]); // Clear if no project path
             return;
        }

        setIsLoadingLocal(true);
        setError(null);
        try {
            const result = await fetchApi<string[]>(
                `/api/localExclusions?projectPath=${encodeURIComponent(currentProjectPath)}`
            );
            if (result !== null) {
                setLocalExclusions(result);
            } else {
                setLocalExclusions([]);
            }
        } finally {
            setIsLoadingLocal(false);
        }
    }, [setIsLoadingLocal, setLocalExclusions, setError]); // projectPath is implicit via getState

    const updateLocalExclusions = useCallback(async (exclusions: string[]) => {
         // Get latest project path from store
        const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
             setError("Cannot update local exclusions without a project path.");
             return false; // Indicate failure
        }

        setIsSavingLocal(true); // Use a specific saving state if needed
        setError(null);
        try {
            const result = await fetchApi<string[]>(
                `/api/localExclusions?projectPath=${encodeURIComponent(currentProjectPath)}`, {
                    method: 'POST',
                    body: JSON.stringify({ localExclusions: exclusions }),
                }
            );
            if (result !== null) {
                setLocalExclusions(result);
                if (currentProjectPath) {
                    await loadProjectTree();
                }
            }
            return result !== null;
        } finally {
            setIsSavingLocal(false);
        }
    }, [setIsSavingLocal, setLocalExclusions, setError, loadProjectTree]); // projectPath implicit

    const fetchProjectIgnoreExclusions = useCallback(async () => {
        const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
            return [];
        }

        setError(null);
        const result = await fetchApi<ProjectIgnoreExclusion[]>(
            `/api/projectIgnoreExclusions?projectPath=${encodeURIComponent(currentProjectPath)}`
        );
        return result ?? [];
    }, [setError]);

    return {
        fetchGlobalExclusions,
        updateGlobalExclusions,
        fetchLocalExclusions,
        updateLocalExclusions,
        fetchProjectIgnoreExclusions
    };
}
