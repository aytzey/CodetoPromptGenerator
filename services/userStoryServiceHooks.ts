import { useCallback } from "react";
import { z } from "zod";
import { fetchApiResult } from "@/services/apiService";
import { useUserStoryStore } from "@/stores/useUserStoryStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { type UserStory, UserStorySchema } from "@/types";

const UserStoryListSchema = z.array(UserStorySchema);

function safeParse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> | null {
  if (data === null || data === undefined) return null;
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;
  useAppStore
    .getState()
    .setError("Received malformed user story data from server. Check console for details.");
  console.error("User story schema validation failed", parsed.error.flatten());
  return null;
}

export function useUserStoryService() {
  const { projectPath } = useProjectStore();
  const { setStories, setLoading, setSaving } = useUserStoryStore();
  const { setError } = useAppStore();

  const baseEndpoint = "/api/user-stories";
  const query = projectPath ? `projectPath=${encodeURIComponent(projectPath)}` : "";

  const loadStories = useCallback(async () => {
    if (!projectPath) {
      setStories([]);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchApiResult<unknown>(`${baseEndpoint}?${query}`);
      const stories = result.ok ? safeParse(UserStoryListSchema, result.data) : null;
      setStories(stories ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectPath, query, setLoading, setStories]);

  const createStory = useCallback(
    async (draft: Omit<UserStory, "id" | "createdAt">) => {
      if (!projectPath) return null;
      setSaving(true);
      setError(null);
      try {
        const result = await fetchApiResult<unknown>(`${baseEndpoint}?${query}`, {
          method: "POST",
          body: JSON.stringify(draft),
        });
        const story = result.ok ? safeParse(UserStorySchema, result.data) : null;
        if (story) await loadStories();
        return story;
      } finally {
        setSaving(false);
      }
    },
    [loadStories, projectPath, query, setError, setSaving],
  );

  const updateStory = useCallback(
    async (storyData: Partial<UserStory> & Pick<UserStory, "id">) => {
      if (!projectPath) return null;
      setSaving(true);
      setError(null);
      try {
        const result = await fetchApiResult<unknown>(`${baseEndpoint}/${storyData.id}?${query}`, {
          method: "PUT",
          body: JSON.stringify(storyData),
        });
        const story = result.ok ? safeParse(UserStorySchema, result.data) : null;
        if (story) await loadStories();
        return story;
      } finally {
        setSaving(false);
      }
    },
    [loadStories, projectPath, query, setError, setSaving],
  );

  const mutateTaskLink = useCallback(
    async (url: string, method: "POST" | "PUT" | "DELETE", body?: unknown) => {
      if (!projectPath) return false;
      setSaving(true);
      setError(null);
      try {
        const result = await fetchApiResult<unknown>(url, {
          method,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!result.ok) return false;
        await loadStories();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [loadStories, projectPath, setError, setSaving],
  );

  const deleteStory = useCallback(
    async (storyId: number) =>
      mutateTaskLink(`${baseEndpoint}/${storyId}?${query}`, "DELETE"),
    [mutateTaskLink, query],
  );

  const updateStoryTasks = useCallback(
    async (storyId: number, taskIds: number[]) =>
      mutateTaskLink(`${baseEndpoint}/${storyId}/tasks?${query}`, "PUT", { taskIds }),
    [mutateTaskLink, query],
  );

  const addTaskToStory = useCallback(
    async (storyId: number, taskId: number) =>
      mutateTaskLink(`${baseEndpoint}/${storyId}/tasks?${query}`, "POST", { taskId }),
    [mutateTaskLink, query],
  );

  const removeTaskFromStory = useCallback(
    async (storyId: number, taskId: number) =>
      mutateTaskLink(`${baseEndpoint}/${storyId}/tasks/${taskId}?${query}`, "DELETE"),
    [mutateTaskLink, query],
  );

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
