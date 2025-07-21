// services/userStoryServiceHooks.ts
import { useCallback } from "react";
import { z } from "zod";
import { ipcService } from "./ipcService";
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

  /* ---------------- list stories ---------------- */
  const loadStories = useCallback(async () => {
    if (!projectPath) {
      setStories([]);
      return;
    }
    setLoading(true);
    try {
      const raw = await ipcService.userstory.list(projectPath);
      const data = safeParse(ArraySchema, raw);
      setStories(data ?? []);
    } catch (error) {
      console.error("Failed to load stories:", error);
      setStories([]);
    }
    setLoading(false);
  }, [projectPath, setStories, setLoading]);

  /* ---------------- create story ---------------- */
  const createStory = useCallback(async (draft: Omit<UserStory, "id" | "createdAt">) => {
    if (!projectPath) return null;
    setSaving(true);
    setError(null);
    
    try {
      const raw = await ipcService.userstory.create(projectPath, draft);
      const story = safeParse(UserStorySchema, raw);
      
      if (story) {
        await loadStories();
      }
      setSaving(false);
      return story;
    } catch (error) {
      setSaving(false);
      console.error("Failed to create story:", error);
      return null;
    }
  }, [projectPath, loadStories, setSaving, setError]);

  /* ---------------- update story ---------------- */
  const updateStory = useCallback(async (storyData: Partial<UserStory> & Pick<UserStory, 'id'>) => {
    if (!projectPath) return null;
    setSaving(true);
    setError(null);
    
    try {
      const raw = await ipcService.userstory.update(projectPath, String(storyData.id), storyData);
      const updatedStory = safeParse(UserStorySchema, raw);

      if (updatedStory) {
        await loadStories();
      }
      setSaving(false);
      return updatedStory;
    } catch (error) {
      setSaving(false);
      console.error("Failed to update story:", error);
      return null;
    }
  }, [projectPath, loadStories, setSaving, setError]);
  
  /* ---------------- delete story ---------------- */
  const deleteStory = useCallback(async (storyId: number) => {
    if (!projectPath) return false;
    setSaving(true);
    setError(null);

    try {
      await ipcService.userstory.delete(projectPath, String(storyId));
      setSaving(false);
      await loadStories();
      return true;
    } catch (error) {
      setSaving(false);
      console.error("Failed to delete story:", error);
      return false;
    }
  }, [projectPath, loadStories, setSaving, setError]);

  /* ---------------- manage task associations ---------------- */
  // TODO: These endpoints are not implemented in IPC handler yet
  const updateStoryTasks = useCallback(async (storyId: number, taskIds: number[]) => {
    console.warn("updateStoryTasks not implemented in IPC handler");
    return false;
  }, []);

  const addTaskToStory = useCallback(async (storyId: number, taskId: number) => {
    console.warn("addTaskToStory not implemented in IPC handler");
    return false;
  }, []);

  const removeTaskFromStory = useCallback(async (storyId: number, taskId: number) => {
    console.warn("removeTaskFromStory not implemented in IPC handler");
    return false;
  }, []);

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