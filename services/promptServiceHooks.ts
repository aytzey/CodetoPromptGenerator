// File: services/promptServiceHooks.ts
// NEW FILE
import { useCallback } from 'react';
import { usePromptStore } from '@/stores/usePromptStore';
import { useAppStore } from '@/stores/useAppStore';
import { fetchApi } from './apiService';

export function usePromptService() {
    const {
        setMetaPromptFiles, setIsLoadingMetaList,
        selectedMetaFile, setMetaPrompt, setIsLoadingMetaContent,
        newMetaFileName, metaPrompt, setIsSavingMeta, setNewMetaFileName
    } = usePromptStore();
    const { setError } = useAppStore();

    const fetchMetaPromptList = useCallback(async () => {
        setIsLoadingMetaList(true);
        setError(null);
        const result = await fetchApi<string[]>(`/api/metaprompts?action=list`);
        if (result) {
            setMetaPromptFiles(result);
        } else {
            setMetaPromptFiles([]); // Clear list on failure
        }
        setIsLoadingMetaList(false);
    }, [setIsLoadingMetaList, setMetaPromptFiles, setError]);

    const loadMetaPrompt = useCallback(async () => {
        // Get latest selected file from store
        const currentSelectedFile = usePromptStore.getState().selectedMetaFile;
        if (!currentSelectedFile) return;

        setIsLoadingMetaContent(true);
        setError(null);
        const result = await fetchApi<{ content: string }>(
            `/api/metaprompts?action=load&file=${encodeURIComponent(currentSelectedFile)}`
        );
        if (result) {
            setMetaPrompt(result.content ?? '');
        } else {
            setMetaPrompt(''); // Clear prompt on failure
        }
        setIsLoadingMetaContent(false);
    }, [setMetaPrompt, setIsLoadingMetaContent, setError]); // Dependency on store state is implicit via getState()

    const saveMetaPrompt = useCallback(async () => {
        // Get latest state from store
        const currentMetaPrompt = usePromptStore.getState().metaPrompt;
        const currentSelectedFile = usePromptStore.getState().selectedMetaFile;
        const currentNewFileName = usePromptStore.getState().newMetaFileName;

        if (!currentMetaPrompt.trim()) {
            setError("Meta prompt content cannot be empty.");
            return;
        }
        const fileName = currentNewFileName.trim() || currentSelectedFile || `meta_${Date.now()}.txt`;

        setIsSavingMeta(true);
        setError(null);
        const result = await fetchApi<{ message: string }>(`/api/metaprompts`, {
            method: 'POST',
            body: JSON.stringify({ filename: fileName, content: currentMetaPrompt }),
        });

        if (result) {
            // Optionally show success message from backend?
            // alert(result.message || `Meta prompt saved as ${fileName}`);
            console.log(result.message || `Meta prompt saved as ${fileName}`);
            setNewMetaFileName(''); // Clear input field
            await fetchMetaPromptList(); // Refresh list after saving
        }
        // Error handling is done by fetchApi
        setIsSavingMeta(false);
    }, [setError, setIsSavingMeta, setNewMetaFileName, fetchMetaPromptList]); // Dependencies

    return { fetchMetaPromptList, loadMetaPrompt, saveMetaPrompt };
}
