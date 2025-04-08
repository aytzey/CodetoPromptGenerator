// File: services/projectServiceHooks.ts
// REFACTOR / OVERWRITE
import { useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
// Removed unused useExclusionStore import
// import { useExclusionStore } from '@/stores/useExclusionStore';
import { useAppStore } from '@/stores/useAppStore';
import { fetchApi } from './apiService';
import { FileNode, FileData } from '@/types'; // Adjusted import based on types/index.ts

export function useProjectService() {
    const {
        projectPath, setFileTree, setIsLoadingTree,
        selectedFilePaths, setFilesData, setIsLoadingContents,
    } = useProjectStore();
    // Removed unused globalExclusions from store, backend handles it implicitly
    // const { globalExclusions } = useExclusionStore();
    const { setError } = useAppStore();

    const loadProjectTree = useCallback(async () => {
        if (!projectPath) return;

        setIsLoadingTree(true);
        setError(null);
        console.log(`Fetching tree for: ${projectPath}`);

        // Backend returns { success: true, data: [...] }
        // fetchApi extracts the 'data' part, so 'result' here will be the array [...]
        const result = await fetchApi<FileNode[]>(`/api/projects/tree?rootDir=${encodeURIComponent(projectPath)}`);

        // --- FIX START ---
        // Check if the result is an array (which is the tree itself)
        if (result && Array.isArray(result)) {
            console.log(`Tree received with ${result.length} root nodes.`);
            setFileTree(result); // Use the result directly as the tree
        } else {
             // Log the actual result structure if it's not the expected array
             console.error("Failed to load tree or unexpected data structure received:", result);
             setFileTree([]); // Clear tree on failure or unexpected structure
             // Error might have been set by fetchApi, or we could set a specific one here
             if (!useAppStore.getState().error) { // Only set error if fetchApi didn't already
                setError("Failed to load project tree: Invalid data received from backend.");
             }
        }
        // --- FIX END ---
        setIsLoadingTree(false);
    }, [projectPath, setIsLoadingTree, setFileTree, setError]); // Dependencies remain the same

    const loadSelectedFileContents = useCallback(async (): Promise<FileData[]> => { // Added return type
        const currentSelectedFiles = useProjectStore.getState().selectedFilePaths;
        const currentProjectPath = useProjectStore.getState().projectPath;

        if (!currentProjectPath || currentSelectedFiles.length === 0) {
            setFilesData([]);
            return []; // Return empty array
        }

        const filesToFetch = currentSelectedFiles.filter(p => !p.endsWith('/'));
         if (filesToFetch.length === 0) {
            setFilesData([]);
            return []; // Return empty array
         }

        setIsLoadingContents(true);
        setError(null);
        console.log(`Fetching content for ${filesToFetch.length} files in ${currentProjectPath}`);

        const body = {
            baseDir: currentProjectPath,
            paths: filesToFetch,
        };

        // Backend returns { success: true, data: [...] }
        // fetchApi extracts the 'data' part, so 'result' will be FileData[] or null
        const result = await fetchApi<FileData[]>(`/api/projects/files`, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (result && Array.isArray(result)) { // Check if result is the expected array
             console.log(`Content received for ${result.length} files.`);
            setFilesData(result);
            setIsLoadingContents(false); // Set loading false here on success
            return result; // Return the fetched data
        } else {
             console.error("Failed to load file contents, result:", result);
             setFilesData([]);
             setIsLoadingContents(false); // Set loading false here on failure
             // Error is set by fetchApi
             return []; // Return empty array on failure
        }
        // setIsLoadingContents(false); // Moved inside if/else for clarity
    }, [setFilesData, setIsLoadingContents, setError]); // Dependencies are state setters

    return { loadProjectTree, loadSelectedFileContents };
}