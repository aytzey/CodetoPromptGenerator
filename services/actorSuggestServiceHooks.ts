// services/actorSuggestServiceHooks.ts
import { useCallback, useState } from "react";
// import { fetchApi } from "@/services/apiService";
import { ipcService } from "./ipcService";

export function useActorSuggestService() {
  const [isSuggesting, setIsSuggesting] = useState(false);

  const suggestActor = useCallback(async (description: string): Promise<number | null> => {
    if (!description.trim()) return null;
    setIsSuggesting(true);
    // TODO: Implement actor suggestion in IPC handler
    // const res = await fetchApi<{ actorId: number }>("/api/actors/suggest", {
    //   method: "POST",
    //   body: JSON.stringify({ description }),
    // });
    const res = null; // Temporarily disabled - not implemented in IPC yet
    setIsSuggesting(false);
    return res ? res.actorId : null;
  }, []);

  return { suggestActor, isSuggesting };
}
