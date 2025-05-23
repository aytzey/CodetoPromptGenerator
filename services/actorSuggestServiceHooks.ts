// services/actorSuggestServiceHooks.ts
import { useCallback, useState } from "react";
import { fetchApi } from "@/services/apiService";

export function useActorSuggestService() {
  const [isSuggesting, setIsSuggesting] = useState(false);

  const suggestActor = useCallback(async (description: string): Promise<number | null> => {
    if (!description.trim()) return null;
    setIsSuggesting(true);
    const res = await fetchApi<{ actorId: number }>("/api/actors/suggest", {
      method: "POST",
      body: JSON.stringify({ description }),
    });
    setIsSuggesting(false);
    return res ? res.actorId : null;
  }, []);

  return { suggestActor, isSuggesting };
}
