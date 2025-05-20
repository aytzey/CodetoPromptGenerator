// FILE: services/kanbanServiceHooks.ts
import { useCallback } from "react";
import { z } from "zod";
import { fetchApi } from "@/services/apiService";
import { useKanbanStore } from "@/stores/useKanbanStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { KanbanItem, KanbanStatus, KanbanItemSchema } from '@/types'; // Import KanbanItemSchema


/* ------------------- zod schemas ------------------- */
// Use KanbanItemSchema directly from types/index.ts
// const ItemSchema = z.object({ ... }); // This local definition is no longer needed

const ArrSchema = z.array(KanbanItemSchema); // Use the imported schema

function safeParse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> | null {
  if (data === null || data === undefined) { // Added undefined check
     return null;
   }
   
  const r = schema.safeParse(data);
  if (!r.success) {
    console.error("Schema validation failed", r.error.flatten()); // Log flattened errors for better readability
    useAppStore.getState().setError("Received malformed data from server. Check console for details.");
    return null;
  }
  return r.data;
}

export function useKanbanService() {
  const { projectPath } = useProjectStore();
   const {
    setAll,
    setLoading,
    setSaving,
    moveItem: moveItemInStore,
   } = useKanbanStore(); 
   
  const { setError } = useAppStore();

  const baseQueryParam = projectPath ? `projectPath=${encodeURIComponent(projectPath)}` : '';
  const baseEndpoint = "/api/kanban";

  /* ---------------- list ---------------- */
  const load = useCallback(async () => {
    if (!projectPath) { 
       setAll([]); 
       return;
    }
    setLoading(true);
    const raw  = await fetchApi<unknown>(`${baseEndpoint}?${baseQueryParam}`);
    const data = safeParse(ArrSchema, raw); // ArrSchema now uses the correct KanbanItemSchema
    setAll(data ?? []);
    setLoading(false);
  }, [projectPath, setAll, setLoading, baseQueryParam]);

  /* ---------------- create -------------- */
   const create = useCallback(async (draft: Omit<KanbanItem, "id" | "createdAt">) => {
    if (!projectPath) return null;
    setSaving(true);
    setError(null); 
    
    const raw  = await fetchApi<unknown>(`${baseEndpoint}?${baseQueryParam}`, {
      method: "POST",
      body:   JSON.stringify(draft),
    });
    
    const item = safeParse(KanbanItemSchema, raw); // Use KanbanItemSchema directly
    
    if (item) {
       await load(); 
    }
    setSaving(false);
    return item;
  }, [projectPath, load, setSaving, setError, baseQueryParam]);

 /* ---------------- update/patch -------------- */
  const patch = useCallback(async (itemData: Partial<KanbanItem> & Pick<KanbanItem, 'id'>) => {
     if (!projectPath) return null;
     setSaving(true);
     setError(null);
     
     const url = `${baseEndpoint}/${itemData.id}?${baseQueryParam}`;
     
     const raw = await fetchApi<unknown>(url, {
       method: "PUT",
       body: JSON.stringify(itemData),
     });
     
     const updatedItem = safeParse(KanbanItemSchema, raw); // Use KanbanItemSchema directly

     if (updatedItem) {
       await load(); 
     } else {
       console.error("Failed to update item via patch.");
       // Error should be set by safeParse or fetchApi, load() will refresh to consistent state
       await load(); 
     }
      setSaving(false);
      return updatedItem;
   }, [projectPath, load, setSaving, setError, baseQueryParam]);
   
  /* ---------------- delete -------------- */
  const deleteItem = useCallback(async (itemId: number) => {
    if (!projectPath) return false;
    setSaving(true);
    setError(null);

    const url = `${baseEndpoint}/${itemId}?${baseQueryParam}`;
    await fetchApi<null>(url, { method: 'DELETE' }); 

    setSaving(false);
    const errorState = useAppStore.getState().error;
    if (errorState) { 
        return false;
    }
    
    await load(); 
    return true; 
  }, [projectPath, load, setSaving, setError, baseQueryParam]);

  /* ---------------- move (dnd) ---------- */
   const relocate = useCallback((itemId: number, newStatus: KanbanStatus, newIndex?: number) => {
       moveItemInStore(itemId, newStatus, newIndex);
   }, [moveItemInStore]);


  return { load, create, patch, deleteItem, relocate };
}