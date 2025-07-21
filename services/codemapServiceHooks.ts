// services/codemapServiceHooks.ts
/**
 * Hook: useCodemapExtractor
 * ─────────────────────────
 * Light wrapper around the `/api/codemap/extract` endpoint that:
 *   • pulls the current projectPath from the store,
 *   • triggers a *single‑shot* POST via SWR‑Mutation,
 *   • returns standard SWR tuple  <trigger, { data, error, isMutating }>
 *
 * Usage:
 *   const { trigger, data, error, isMutating } = useCodemapExtractor();
 *   …
 *   trigger({ paths: selectedRelativePaths });
 */

import useSWRMutation from "swr/mutation";
import { useProjectStore } from "@/stores/useProjectStore";
// import { fetchApi } from "./apiService";
import { ipcService } from "./ipcService";
import type { CodemapRequest, CodemapResponse } from "@/types";

export function useCodemapExtractor() {
  const { projectPath } = useProjectStore();

  /** The *mutate/trigger* function expected by SWR‑Mutation */
  const poster = async (
    _key: string,
    { arg }: { arg: Pick<CodemapRequest, "paths"> },
  ) => {
    if (!projectPath) {
      throw new Error("Project path missing – cannot extract codemap.");
    }
    // TODO: Implement codemap extraction in IPC handler
    // const body: CodemapRequest = { baseDir: projectPath, paths: arg.paths };
    // const res = await fetchApi<CodemapResponse>(
    //   "/api/codemap/extract",
    //   { method: "POST", body: JSON.stringify(body) },
    // );
    // if (!res) throw new Error("Codemap extraction failed – see global error.");
    // return res;
    throw new Error("Codemap extraction not implemented in IPC handler yet");
  };

  return useSWRMutation<CodemapResponse, Error, string>("/api/codemap/extract", poster);
}
