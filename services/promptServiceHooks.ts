// FILE: services/promptServiceHooks.ts
// FULL FILE - Verified useRefinePrompt function
import { useCallback, useState } from 'react'; // Added useState
import { usePromptStore } from '@/stores/usePromptStore';
import { useAppStore } from '@/stores/useAppStore';
import { fetchApi } from './apiService';

// Type for the refine API response
interface RefinePromptResponse {
    refinedPrompt: string;
}

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

    // --- NEW FUNCTION for Prompt Refinement ---
    const useRefinePrompt = () => {
        const [isRefining, setIsRefining] = useState(false);
        const { setError } = useAppStore(); // Get setError from the app store

        const refinePrompt = useCallback(async (textToRefine: string): Promise<string | null> => {
            if (!textToRefine.trim()) {
                setError("Cannot refine empty text.");
                return null;
            }

            setIsRefining(true);
            setError(null); // Clear previous errors

            const result = await fetchApi<RefinePromptResponse>(`/api/prompt/refine`, {
                method: 'POST',
                body: JSON.stringify({ text: textToRefine }),
            });

            setIsRefining(false);

            if (result) {
                // Ensure the response structure matches before accessing refinedPrompt
                if (typeof result === 'object' && result !== null && 'refinedPrompt' in result) {
                    return result.refinedPrompt;
                } else {
                    console.error("Unexpected response structure from /api/prompt/refine:", result);
                    setError("Received unexpected data format from refinement service.");
                    return null;
                }
            } else {
                // Error is handled globally by fetchApi, but we return null to indicate failure
                return null;
            }
        }, [setError]); // Add setError dependency

        return { refinePrompt, isRefining };
    };
    // --- END NEW FUNCTION ---


    return { fetchMetaPromptList, loadMetaPrompt, saveMetaPrompt, useRefinePrompt };
}