// FILE: views/LocalExclusionsManagerView.tsx
/**
 * Project‑specific exclusion manager
 * ───────────────────────────────────
 * • Fully wired to zustand (`useExclusionStore`) + service layer
 *   (`useExclusionService`) so that selections / “Select All” immediately
 *   respect the list.                                                 SOLID – SRP
 * • No direct fetch calls – the service deals with I/O and global
 *   error handling.                                                    SOLID – DIP
 * • Inline validation, loading / saving spinners and keyboard UX.
 * • **MODIFIED (vNext):** Updated placeholder text.
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  FileX, Plus, X, Loader2, AlertTriangle,
} from "lucide-react";

import { Card }                    from "@/components/ui/card";
import { Button }                  from "@/components/ui/button";
import { Input }                   from "@/components/ui/input";
import { Badge }                   from "@/components/ui/badge";
import { ScrollArea }              from "@/components/ui/scroll-area";
import { TooltipProvider,
         Tooltip, TooltipTrigger,
         TooltipContent }          from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useExclusionStore }       from "@/stores/useExclusionStore";
import { useProjectStore }         from "@/stores/useProjectStore";
import { useExclusionService }     from "@/services/exclusionServiceHooks";

const COMMON_HINTS = [
  "package‑lock.json", "yarn.lock", ".env", "README.md", "LICENSE", "*.log", "*.tmp", "*.bak", "*.swp" // Added wildcards
];

export default function LocalExclusionsManagerView() {
  /* ───── global state ───── */
  const { projectPath }         = useProjectStore();
  const {
    localExclusions,
    isLoadingLocal,  isSavingLocal,
  } = useExclusionStore();
  const {
    fetchLocalExclusions,
    updateLocalExclusions,
  } = useExclusionService();

  /* ───── local UI state ───── */
  const [draft, setDraft]       = useState("");
  const [error, setError]       = useState<string|null>(null);

  /* ───── lifecycle ───── */
  useEffect(() => {
    if (projectPath) fetchLocalExclusions();
  }, [projectPath, fetchLocalExclusions]);

  /* ───── helpers ───── */
  const canSave   = draft.trim().length > 0 && !isSavingLocal;
  const listEmpty = localExclusions.length === 0;

  const sorted    = useMemo(
    () => [...localExclusions].sort((a,b) => a.localeCompare(b)),
    [localExclusions],
  );

  const addEntry = async () => {
    if (!canSave) return;
    const entry = draft.trim();
    if (localExclusions.includes(entry)) {
      setDraft(""); return;
    }
    const next = [...localExclusions, entry];
    const ok   = await updateLocalExclusions(next);
    if (!ok)   setError("Failed to save exclusions – check global error.");
    else       setDraft("");
  };

  const rmEntry  = async (e: string) => {
    const next = localExclusions.filter(x => x !== e);
    const ok   = await updateLocalExclusions(next);
    if (!ok) setError("Failed to remove item – check global error.");
  };

  /* ───── render ───── */
  return (
    <Card className="p-4 space-y-3 bg-white dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 shadow-sm">
      {/* header */}
      <div className="flex items-center gap-2">
        <FileX size={18} className="text-purple-500 dark:text-purple-400" />
        <span className="text-base font-medium">
          Project‑Specific Exclusions
        </span>
        {!listEmpty && (
          <Badge variant="outline" className="ml-1">
            {localExclusions.length}
          </Badge>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 mb-1">
        Skipped by “Select All” in this project. Use patterns like <code>*.log</code> or specific files/folders.
      </p>

      {/* error (component‑local) */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* add row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="e.g. *.test.js or config/secrets.json" // Updated placeholder
            value={draft}
            disabled={isSavingLocal}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canSave && addEntry()}
          />
          {draft && (
            <Button
              variant="ghost" size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-gray-600"
              onClick={() => setDraft("")}
            >
              <X size={14}/>
            </Button>
          )}
        </div>
        <Button
          disabled={!canSave}
          onClick={addEntry}
          className="w-[72px] bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isSavingLocal ? <Loader2 className="animate-spin" size={16}/> :
            <><Plus size={16} className="mr-1"/>Add</>}
        </Button>
      </div>

      {/* quick suggestions */}
      {!draft && (
        <div className="flex flex-wrap gap-1 text-xs">
          {COMMON_HINTS
            .filter(h => !localExclusions.includes(h))
            .map(h => (
              <Badge key={h} variant="outline"
                     className="cursor-pointer"
                     onClick={() => setDraft(h)}>
                {h}
              </Badge>
          ))}
        </div>
      )}

      {/* list */}
      <ScrollArea className="h-32 border rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {isLoadingLocal && listEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <Loader2 className="animate-spin mb-1" size={18}/>
            <span className="text-xs text-gray-500">Loading…</span>
          </div>
        ) : listEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-4 text-gray-500 dark:text-gray-400 text-xs">
            <AlertTriangle size={18} className="mb-1"/>
            No project-specific exclusions yet.
          </div>
        ) : (
          <ul className="p-2 space-y-1.5">
            {sorted.map(e => (
              <li key={e} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 px-2 py-1">
                <span className="font-mono text-xs truncate">{e}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-5 w-5 text-gray-400 hover:text-rose-500"
                        onClick={() => rmEntry(e)}
                        disabled={isSavingLocal}
                      >
                        <X size={14}/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Remove
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}