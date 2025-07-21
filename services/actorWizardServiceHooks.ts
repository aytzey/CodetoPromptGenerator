import { useCallback, useState } from "react";
// import { fetchApi } from "@/services/apiService";
import { ipcService } from "./ipcService";
import { useProjectStore } from "@/stores/useProjectStore";
import { useActorStore } from "@/stores/useActorStore";
import { flattenTree } from "@/lib/fileFilters";
import { ActorSchema } from "@/types";
import { z } from "zod";
import { useAppStore } from "@/stores/useAppStore";

export function useActorWizardService() {
  const projectStore = useProjectStore;
  const actorStore = useActorStore;
  const { setError } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateActors = useCallback(async () => {
    const { projectPath, fileTree } = projectStore.getState();
    if (!projectPath || isGenerating) return;
    const treePaths = flattenTree(fileTree);
    setIsGenerating(true);
    // TODO: Implement actor generation in IPC handler
    // const res = await fetchApi<{ actors: unknown }>("/api/actors/generate", {
    //   method: "POST",
    //   body: JSON.stringify({ baseDir: projectPath, treePaths }),
    // });
    const res = null; // Temporarily disabled - not implemented in IPC yet
    setIsGenerating(false);
    if (!res) return;
    const parsed = z.array(ActorSchema).safeParse(res.actors);
    if (!parsed.success) {
      console.error("Actor wizard schema validation failed", parsed.error);
      setError("Received malformed data from server.");
      return;
    }
    actorStore.getState().setActors(parsed.data);
  }, [isGenerating, projectStore, actorStore, setError]);

  return { generateActors, isGenerating };
}
