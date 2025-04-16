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
        // Get latest project path from store to ensure it's current
        const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
             console.log("loadProjectTree: No project path set, skipping fetch.");
             setFileTree([]); // Ensure tree is cleared if path is removed
             setIsLoadingTree(false); // Ensure loading is false if we skip
             return;
        }

        setIsLoadingTree(true);
        setError(null);
        console.log(`Fetching tree for: ${currentProjectPath}`);

        // Backend returns { success: true, data: [...] }
        // fetchApi extracts the 'data' part, so 'result' should be the array [...] or null on error
        const result = await fetchApi<FileNode[]>(`/api/projects/tree?rootDir=${encodeURIComponent(currentProjectPath)}`);

        // --- Robust Validation START ---
        // Validate that the result from fetchApi is indeed the expected array structure
        // It could be null (if fetchApi handled an error) or potentially something else if API response was unexpected.
        if (result && Array.isArray(result)) {
            // SUCCESS CASE: Data is a valid array
            console.log(`Tree received with ${result.length} root nodes.`); // Added console log for verification
            setFileTree(result); // Use the result directly as the tree
        } else {
             // FAILURE CASE: Data is null, not an array, or fetchApi handled an error
             console.error("Failed to load tree or unexpected data structure received from API:", result);
             setFileTree([]); // Clear tree on failure or unexpected structure
             // Add a fallback error message only if fetchApi didn't already set one and result wasn't null
             if (!useAppStore.getState().error && result !== null) {
                setError("Failed to load project tree: Invalid data format received from backend.");
             }
             // If result is null, fetchApi should have already set the error state.
        }
        // --- Robust Validation END ---

        setIsLoadingTree(false); // Ensure loading is set to false in all cases (after processing)
    }, [setIsLoadingTree, setFileTree, setError]); // Dependencies: setters and error handler

    const loadSelectedFileContents = useCallback(async (): Promise<FileData[]> => { // Added return type
        const currentSelectedFiles = useProjectStore.getState().selectedFilePaths;
        const currentProjectPath = useProjectStore.getState().projectPath;

        // Skip if no path or no selection
        if (!currentProjectPath || currentSelectedFiles.length === 0) {
            setFilesData([]);
            setIsLoadingContents(false); // Ensure loading is false
            return []; // Return empty array
        }

        // Filter out directories, only fetch files
        const filesToFetch = currentSelectedFiles.filter(p => !p.endsWith('/')); // Simple check for directory marker
         if (filesToFetch.length === 0) {
            // If only directories were selected, ensure file data is cleared and exit
            const currentFilesData = useProjectStore.getState().filesData;
            if (currentFilesData.length > 0) {
                setFilesData([]);
            }
            setIsLoadingContents(false); // Ensure loading is false
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

        // --- Robust Validation START ---
        // Validate the result structure before setting state
        let fetchedData: FileData[] = []; // Define variable to hold data or empty array
        if (result && Array.isArray(result)) { // Check if result is the expected array
             console.log(`Content received for ${result.length} files.`);
             setFilesData(result); // Update state
             fetchedData = result; // Assign fetched data for return
        } else {
             // FAILURE CASE: Handle null or non-array result
             console.error("Failed to load file contents or unexpected data structure received:", result);
             setFilesData([]); // Clear data on failure
             // Add fallback error if needed and result wasn't null
             if (!useAppStore.getState().error && result !== null) {
                setError("Failed to load file contents: Invalid data format received from backend.");
             }
             // fetchedData remains []
        }
        // --- Robust Validation END ---

        setIsLoadingContents(false); // Ensure loading is set to false after processing
        return fetchedData; // Return the processed data (or empty array)

    }, [setFilesData, setIsLoadingContents, setError]); // Dependencies are state setters and error handler

    return { loadProjectTree, loadSelectedFileContents };
}