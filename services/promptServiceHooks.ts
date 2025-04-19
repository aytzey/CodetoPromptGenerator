// FILE: services/promptServiceHooks.ts
// FULL FILE - Updated useRefinePrompt function
import { useCallback, useState } from 'react';
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
            setMetaPromptFiles([]);
        }
        setIsLoadingMetaList(false);
    }, [setIsLoadingMetaList, setMetaPromptFiles, setError]);

    const loadMetaPrompt = useCallback(async () => {
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
            setMetaPrompt('');
        }
        setIsLoadingMetaContent(false);
    }, [setMetaPrompt, setIsLoadingMetaContent, setError]);

    const saveMetaPrompt = useCallback(async () => {
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
            console.log(result.message || `Meta prompt saved as ${fileName}`);
            setNewMetaFileName('');
            await fetchMetaPromptList();
        }
        setIsSavingMeta(false);
    }, [setError, setIsSavingMeta, setNewMetaFileName, fetchMetaPromptList]);

    // --- UPDATED FUNCTION for Prompt Refinement ---
    const useRefinePrompt = () => {
        const [isRefining, setIsRefining] = useState(false);
        const { setError } = useAppStore();

        // Updated signature to accept optional treeText
        const refinePrompt = useCallback(async (textToRefine: string, treeText?: string): Promise<string | null> => {
            if (!textToRefine.trim()) {
                setError("Cannot refine empty text.");
                return null;
            }

            setIsRefining(true);
            setError(null);

            // Include treeText in the request body if provided
            const body = { text: textToRefine, treeText: treeText };

            const result = await fetchApi<RefinePromptResponse>(`/api/prompt/refine`, {
                method: 'POST',
                body: JSON.stringify(body), // Send updated body
            });

            setIsRefining(false);

            if (result) {
                if (typeof result === 'object' && result !== null && 'refinedPrompt' in result) {
                    return result.refinedPrompt;
                } else {
                    console.error("Unexpected response structure from /api/prompt/refine:", result);
                    setError("Received unexpected data format from refinement service.");
                    return null;
                }
            } else {
                return null;
            }
        }, [setError]);

        return { refinePrompt, isRefining };
    };
    // --- END UPDATED FUNCTION ---


    return { fetchMetaPromptList, loadMetaPrompt, saveMetaPrompt, useRefinePrompt };
}