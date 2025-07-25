// services/actorServiceHooks.ts
import { useCallback } from "react";
import { z } from "zod";
import { ipcService } from "@/services/ipcService";
import { useActorStore } from "@/stores/useActorStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { Actor, ActorSchema } from '@/types';

/* ------------------- zod schemas ------------------- */
const ArraySchema = z.array(ActorSchema);

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

export function useActorService() {
  const { projectPath } = useProjectStore();
  const {
    setActors,
    setLoading,
    setSaving,
    addActorOptimistic,
    updateActorOptimistic,
    removeActorOptimistic,
  } = useActorStore();
  
  const { setError } = useAppStore();

  /* ---------------- list actors ---------------- */
  const loadActors = useCallback(async () => {
    // Actors can be global or project-specific
    setLoading(true);
    const raw = await ipcService.actor.list(projectPath || '');
    const data = safeParse(ArraySchema, raw);
    setActors(data ?? []);
    setLoading(false);
  }, [projectPath, setActors, setLoading]);

  /* ---------------- create actor ---------------- */
  const createActor = useCallback(async (draft: Omit<Actor, "id">) => {
    setSaving(true);
    setError(null);
    
    // Optimistic update
    // Assign a temporary ID for optimistic rendering
    const tempId = Date.now(); // Simple timestamp-based ID
    const optimisticActor: Actor = { id: tempId, ...draft };
    addActorOptimistic(optimisticActor);

    const raw = await ipcService.actor.create(projectPath || '', draft);
    
    const actor = safeParse(ActorSchema, raw);
    
    if (actor) {
      // Replace optimistic actor with real one or just reload
      // For simplicity and consistency with other services, we'll reload.
      await loadActors(); 
    } else {
      // Revert optimistic update on failure
      removeActorOptimistic(tempId);
      // Ensure UI is consistent if API fails
      await loadActors();
    }
    setSaving(false);
    return actor;
  }, [addActorOptimistic, loadActors, removeActorOptimistic, setSaving, setError, projectPath]);

  /* ---------------- update actor ---------------- */
  const updateActor = useCallback(async (actorData: Partial<Actor> & Pick<Actor, 'id'>) => {
    setSaving(true);
    setError(null);
    
    // Optimistic update
    updateActorOptimistic(actorData.id, actorData);
    
    const raw = await ipcService.actor.update(projectPath || '', actorData.id, actorData);
    
    const updatedActor = safeParse(ActorSchema, raw);

    if (updatedActor) {
      // For simplicity and consistency with other services, we'll reload.
      await loadActors();
    } else {
      // Revert optimistic update on failure
      await loadActors(); // Reload to get actual state
    }
    setSaving(false);
    return updatedActor;
  }, [updateActorOptimistic, loadActors, setSaving, setError, projectPath]);
  
  /* ---------------- delete actor ---------------- */
  const deleteActor = useCallback(async (actorId: number) => {
    setSaving(true);
    setError(null);

    // Optimistic update
    removeActorOptimistic(actorId);

    // ipcService returns success status for DELETE
    const response = await ipcService.actor.delete(projectPath || '', actorId);

    setSaving(false);
    const wasErrorSet = useAppStore.getState().error !== null;
    if (wasErrorSet) {
      // Revert optimistic update on failure
      await loadActors(); // Reload to get actual state
      return false;
    }
    return true; // Success
  }, [removeActorOptimistic, loadActors, setSaving, setError, projectPath]);

  return {
    loadActors,
    createActor,
    updateActor,
    deleteActor,
  };
}