// services/userStoryServiceHooks.ts
import { useCallback } from "react";
import { z } from "zod";
import { fetchApi } from "@/services/apiService";
import { useUserStoryStore } from "@/stores/useUserStoryStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { UserStory, UserStorySchema } from '@/types';

/* ------------------- zod schemas ------------------- */
const ArraySchema = z.array(UserStorySchema);

function safeParse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> | null {
  if (data === null || data === undefined) {
    return null;
  }
  
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error("Schema validation failed", result.error.flatten());
    useAppStore.getState().setError("Received malformed data from server. Check console for details.");
    return null;
  }
  return result.data;
}

export function useUserStoryService() {
  const { projectPath } = useProjectStore();
  const {
    setStories,
    setLoading,
    setSaving,
  } = useUserStoryStore();
  
  const { setError } = useAppStore();

  const baseQueryParam = projectPath ? `projectPath=${encodeURIComponent(projectPath)}` : '';
  const baseEndpoint = "/api/user-stories";

  /* ---------------- list stories ---------------- */
  const loadStories = useCallback(async () => {
    if (!projectPath) {
      setStories([]);
      return;
    }
    setLoading(true);
    const raw = await fetchApi<unknown>(`${baseEndpoint}?${baseQueryParam}`);
    const data = safeParse(ArraySchema, raw);
    setStories(data ?? []);
    setLoading(false);
  }, [projectPath, setStories, setLoading, baseQueryParam]);

  /* ---------------- create story ---------------- */
  const createStory = useCallback(async (draft: Omit<UserStory, "id" | "createdAt">) => {
    if (!projectPath) return null;
    setSaving(true);
    setError(null);
    
    const raw = await fetchApi<unknown>(`${baseEndpoint}?${baseQueryParam}`, {
      method: "POST",
      body: JSON.stringify(draft),
    });
    
    const story = safeParse(UserStorySchema, raw);
    
    if (story) {
      await loadStories();
    }
    setSaving(false);
    return story;
  }, [projectPath, loadStories, setSaving, setError, baseQueryParam]);

  /* ---------------- update story ---------------- */
  const updateStory = useCallback(async (storyData: Partial<UserStory> & Pick<UserStory, 'id'>) => {
    if (!projectPath) return null;
    setSaving(true);
    setError(null);
    
    const url = `${baseEndpoint}/${storyData.id}?${baseQueryParam}`;
    
    const raw = await fetchApi<unknown>(url, {
      method: "PUT",
      body: JSON.stringify(storyData),
    });
    
    const updatedStory = safeParse(UserStorySchema, raw);

    if (updatedStory) {
      await loadStories();
    }
    setSaving(false);
    return updatedStory;
  }, [projectPath, loadStories, setSaving, setError, baseQueryParam]);
  
  /* ---------------- delete story ---------------- */
  const deleteStory = useCallback(async (storyId: number) => {
    if (!projectPath) return false;
    setSaving(true);
    setError(null);

    const url = `${baseEndpoint}/${storyId}?${baseQueryParam}`;
    await fetchApi<null>(url, { method: 'DELETE' });

    setSaving(false);
    const errorState = useAppStore.getState().error;
    if (errorState) {
      return false;
    }
    
    await loadStories();
    return true;
  }, [projectPath, loadStories, setSaving, setError, baseQueryParam]);

  /* ---------------- manage task associations ---------------- */
  const updateStoryTasks = useCallback(async (storyId: number, taskIds: number[]) => {
    if (!projectPath) return false;
    setSaving(true);
    setError(null);

    const url = `${baseEndpoint}/${storyId}/tasks?${baseQueryParam}`;
    await fetchApi<unknown>(url, {
      method: 'PUT',
      body: JSON.stringify({ taskIds }),
    });

    setSaving(false);
    const errorState = useAppStore.getState().error;
    if (errorState) {
      return false;
    }
    
    await loadStories();
    return true;
  }, [projectPath, loadStories, setSaving, setError, baseQueryParam]);

  const addTaskToStory = useCallback(async (storyId: number, taskId: number) => {
    if (!projectPath) return false;
    setSaving(true);
    setError(null);

    const url = `${baseEndpoint}/${storyId}/tasks?${baseQueryParam}`;
    await fetchApi<unknown>(url, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });

    setSaving(false);
    const errorState = useAppStore.getState().error;
    if (errorState) {
      return false;
    }
    
    await loadStories();
    return true;
  }, [projectPath, loadStories, setSaving, setError, baseQueryParam]);

  const removeTaskFromStory = useCallback(async (storyId: number, taskId: number) => {
    if (!projectPath) return false;
    setSaving(true);
    setError(null);

    const url = `${baseEndpoint}/${storyId}/tasks/${taskId}?${baseQueryParam}`;
    await fetchApi<null>(url, { method: 'DELETE' });

    setSaving(false);
    const errorState = useAppStore.getState().error;
    if (errorState) {
      return false;
    }
    
    await loadStories();
    return true;
  }, [projectPath, loadStories, setSaving, setError, baseQueryParam]);

  return {
    loadStories,
    createStory,
    updateStory,
    deleteStory,
    updateStoryTasks,
    addTaskToStory,
    removeTaskFromStory,
  };
}