import { useCallback } from "react";
import { z } from "zod";
import { fetchApiResult } from "@/services/apiService";
import { useKanbanStore } from "@/stores/useKanbanStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { type KanbanItem, type KanbanStatus, KanbanItemSchema } from "@/types";

const KanbanListSchema = z.array(KanbanItemSchema);

function safeParse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> | null {
  if (data === null || data === undefined) return null;
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;
  useAppStore
    .getState()
    .setError("Received malformed Kanban data from server. Check console for details.");
  console.error("Kanban schema validation failed", parsed.error.flatten());
  return null;
}

export function useKanbanService() {
  const { projectPath } = useProjectStore();
  const { setAll, setLoading, setSaving, moveItem: moveItemInStore } = useKanbanStore();
  const { setError } = useAppStore();
  const baseEndpoint = "/api/kanban";
  const query = projectPath ? `projectPath=${encodeURIComponent(projectPath)}` : "";

  const load = useCallback(async () => {
    if (!projectPath) {
      setAll([]);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchApiResult<unknown>(`${baseEndpoint}?${query}`);
      const items = result.ok ? safeParse(KanbanListSchema, result.data) : null;
      setAll(items ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectPath, query, setAll, setLoading]);

  const create = useCallback(
    async (draft: Omit<KanbanItem, "id" | "createdAt">) => {
      if (!projectPath) return null;
      setSaving(true);
      setError(null);
      try {
        const result = await fetchApiResult<unknown>(`${baseEndpoint}?${query}`, {
          method: "POST",
          body: JSON.stringify(draft),
        });
        const item = result.ok ? safeParse(KanbanItemSchema, result.data) : null;
        if (item) await load();
        return item;
      } finally {
        setSaving(false);
      }
    },
    [load, projectPath, query, setError, setSaving],
  );

  const patch = useCallback(
    async (itemData: Partial<KanbanItem> & Pick<KanbanItem, "id">) => {
      if (!projectPath) return null;
      setSaving(true);
      setError(null);
      try {
        const result = await fetchApiResult<unknown>(
          `${baseEndpoint}/${itemData.id}?${query}`,
          {
            method: "PUT",
            body: JSON.stringify(itemData),
          },
        );
        const updated = result.ok ? safeParse(KanbanItemSchema, result.data) : null;
        await load();
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [load, projectPath, query, setError, setSaving],
  );

  const deleteItem = useCallback(
    async (itemId: number) => {
      if (!projectPath) return false;
      setSaving(true);
      setError(null);
      try {
        const result = await fetchApiResult<null>(`${baseEndpoint}/${itemId}?${query}`, {
          method: "DELETE",
        });
        if (!result.ok) return false;
        await load();
        return true;
      } finally {
        setSaving(false);
      }
    },
    [load, projectPath, query, setError, setSaving],
  );

  const relocate = useCallback(
    (itemId: number, newStatus: KanbanStatus, newIndex?: number) => {
      moveItemInStore(itemId, newStatus, newIndex);
    },
    [moveItemInStore],
  );

  return { load, create, patch, deleteItem, relocate };
}
