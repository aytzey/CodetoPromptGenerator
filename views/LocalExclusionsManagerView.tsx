// FILE: views/LocalExclusionsManagerView.tsx
/**
 * Project‑specific exclusion manager
 * ───────────────────────────────────
 * • Fully wired to zustand (`useExclusionStore`) + service layer
 *   (`useExclusionService`) so that selections / "Select All" immediately
 *   respect the list.                                                 SOLID – SRP
 * • No direct fetch calls – the service deals with I/O and global
 *   error handling.                                                    SOLID – DIP
 * • Inline validation, loading / saving spinners and keyboard UX.
 * • Enhanced with modern visual design for portfolio showcase.
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  FileX, Plus, X, Loader2, AlertTriangle, Filter, 
  Settings, Terminal, ListFilter, Check, Info
} from "lucide-react";

import { Card }                    from "@/components/ui/card";
import { Button }                  from "@/components/ui/button";
import { Input }                   from "@/components/ui/input";
import { Badge }                   from "@/components/ui/badge";
import { ScrollArea }              from "@/components/ui/scroll-area";
import { Separator }              from "@/components/ui/separator";
import { TooltipProvider,
         Tooltip, TooltipTrigger,
         TooltipContent }          from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useExclusionStore }       from "@/stores/useExclusionStore";
import { useProjectStore }         from "@/stores/useProjectStore";
import { useExclusionService }     from "@/services/exclusionServiceHooks";

const COMMON_HINTS = [
  "package‑lock.json", "yarn.lock", ".env", "README.md", "LICENSE", "*.log", "*.tmp", "*.bak", "*.swp"
];

export default function LocalExclusionsManagerView() {
  /* ───── global state ───── */
  const projectPath = useProjectStore(s => s.projectPath);
  
  const localExclusions = useExclusionStore(s => s.localExclusions);
  const isLoadingLocal = useExclusionStore(s => s.isLoadingLocal);
  const isSavingLocal = useExclusionStore(s => s.isSavingLocal);

  const {
    fetchLocalExclusions,
    updateLocalExclusions,
  } = useExclusionService();

  /* ───── local UI state ───── */
  const [draft, setDraft]       = useState("");
  const [error, setError]       = useState<string|null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canSave) {
      addEntry();
    }
  };

  /* ───── render ───── */
  return (
    <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-fade-in">
      {/* Header with project exclusions title */}
      <div className="p-5 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(189,147,249,0.1)] backdrop-blur-sm border border-[rgba(189,147,249,0.2)] shadow-sm">
              <FileX size={20} className="text-[rgb(189,147,249)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(189,147,249)] to-[rgb(255,121,198)]">
                Project Exclusions
              </h3>
              <p className="text-xs text-[rgb(140,143,170)] mt-0.5">
                Patterns skipped by "Select All" in this project only
              </p>
            </div>
          </div>
          
          {/* Count badge */}
          {!listEmpty && (
            <Badge className="bg-[rgba(189,147,249,0.1)] text-[rgb(189,147,249)] border border-[rgba(189,147,249,0.3)]">
              {localExclusions.length}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4 bg-[rgba(22,23,46,0.5)]">
        {/* Error message */}
        {error && (
          <Alert className="bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] border border-[rgba(255,85,85,0.3)]">
            <AlertTriangle size={16} className="mr-2" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Add input row */}
        <div className="space-y-1">
          <div className="text-xs text-[rgb(190,192,210)] flex items-center mb-1">
            <Plus size={12} className="mr-1.5 text-[rgb(189,147,249)]" />
            Add Exclusion Pattern
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="e.g. *.test.js or config/secrets.json"
                value={draft}
                disabled={isSavingLocal}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-10 bg-[rgba(15,16,36,0.6)] border-[rgba(60,63,87,0.7)] focus:ring-1 focus:ring-[rgb(189,147,249)] focus:border-transparent text-[rgb(224,226,240)]"
              />
              <FileX className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(140,143,170)]" />
              
              {draft && (
                <Button
                  variant="ghost" 
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-[rgb(140,143,170)] hover:text-[rgb(224,226,240)]"
                  onClick={() => setDraft("")}
                  disabled={isSavingLocal}
                >
                  <X size={14}/>
                </Button>
              )}
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!canSave}
                    onClick={addEntry}
                    className="h-10 bg-gradient-to-r from-[rgb(189,147,249)] to-[rgb(189,147,249)] hover:from-[rgb(189,147,249)] hover:to-[rgb(255,121,198)] text-[rgb(15,16,36)] font-medium shadow-[0_2px_10px_rgba(189,147,249,0.25)]"
                  >
                    {isSavingLocal ? 
                      <Loader2 className="animate-spin" size={18}/> :
                      <><Plus size={18} className="mr-1.5"/>Add</>
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                  <p>Add this exclusion pattern to the project</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Quick suggestion patterns */}
        {!draft && (
          <div className="border border-[rgba(60,63,87,0.5)] rounded-lg p-3 bg-[rgba(15,16,36,0.3)]">
            <div className="flex items-center mb-2 text-xs text-[rgb(190,192,210)]">
              <Settings size={12} className="mr-1.5 text-[rgb(189,147,249)]" />
              Common Exclusion Patterns
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_HINTS
                .filter(h => !localExclusions.includes(h))
                .map((h, index) => (
                  <Badge 
                    key={h} 
                    className="cursor-pointer bg-[rgba(15,16,36,0.4)] text-[rgb(190,192,210)] hover:text-[rgb(224,226,240)] border border-[rgba(60,63,87,0.7)] hover:border-[rgba(189,147,249,0.4)] hover:bg-[rgba(189,147,249,0.1)] font-mono transition-all duration-150 animate-fade-in"
                    onClick={() => setDraft(h)}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {h}
                  </Badge>
                ))
              }
            </div>
          </div>
        )}

        {/* Separator with label */}
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-[rgba(60,63,87,0.5)]"></div>
          <span className="flex-shrink mx-3 text-xs text-[rgb(140,143,170)] flex items-center">
            <Filter size={10} className="mr-1" />
            Current Exclusions
          </span>
          <div className="flex-grow border-t border-[rgba(60,63,87,0.5)]"></div>
        </div>

        {/* List of current exclusions */}
        <div className="border rounded-xl overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(15,16,36,0.3)] backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(60,63,87,0.5)] bg-[rgba(15,16,36,0.3)]">
            <div className="flex items-center text-xs text-[rgb(140,143,170)]">
              <Terminal size={12} className="mr-1.5" />
              Project-specific patterns
            </div>
            {sorted.length > 0 && (
              <Badge className="bg-transparent text-[rgb(140,143,170)] border-[rgba(60,63,87,0.5)]">
                {sorted.length}
              </Badge>
            )}
          </div>
          
          <ScrollArea className="h-[180px]">
            {isLoadingLocal && listEmpty ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-[rgb(140,143,170)]">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-[rgb(189,147,249)] animate-spin"></div>
                  <div className="w-10 h-10 rounded-full border-l-2 border-r-2 border-[rgb(123,147,253)] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  <FileX size={14} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[rgb(224,226,240)]" />
                </div>
                <p className="mt-4 text-sm">Loading exclusions...</p>
              </div>
            ) : listEmpty ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-[rgb(140,143,170)]">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[rgba(60,63,87,0.2)] mb-3">
                  <AlertTriangle size={24} className="opacity-60" />
                </div>
                <p className="text-lg">No project exclusions yet</p>
                <p className="text-sm mt-1 max-w-xs text-center">
                  Add patterns to exclude specific files in this project
                </p>
              </div>
            ) : (
              <ul className="p-3 space-y-2">
                {sorted.map((e, index) => (
                  <li 
                    key={e} 
                    className={`flex justify-between items-center rounded-lg border px-3 py-2 transition-colors duration-150 animate-fade-in ${
                      hoveredItem === e
                        ? 'bg-[rgba(189,147,249,0.05)] border-[rgba(189,147,249,0.3)]'
                        : 'bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.5)]'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onMouseEnter={() => setHoveredItem(e)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center">
                      <FileX size={14} className={`mr-2 ${
                        hoveredItem === e ? 'text-[rgb(189,147,249)]' : 'text-[rgb(140,143,170)]'
                      }`} />
                      <span className="font-mono text-sm text-[rgb(224,226,240)]">{e}</span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] hover:bg-[rgba(255,85,85,0.2)] hover:text-[rgb(255,85,85)]"
                            onClick={() => rmEntry(e)}
                            disabled={isSavingLocal}
                          >
                            <X size={14}/>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                          <p>Remove from exclusions</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
        
        {/* Help text at the bottom */}
        <div className="text-xs text-[rgb(140,143,170)] p-3 bg-[rgba(189,147,249,0.05)] rounded-lg border border-[rgba(189,147,249,0.1)] mt-2">
          <div className="flex items-center gap-1.5 mb-1 text-[rgb(189,147,249)]">
            <Info size={12} className="text-[rgb(189,147,249)]" />
            <span className="font-medium">About project exclusions:</span>
          </div>
          These patterns will be excluded when using "Select All" in this project only.
          <span className="block mt-1">Use patterns like <code className="bg-[rgba(15,16,36,0.5)] px-1.5 py-0.5 rounded text-[rgb(255,121,198)]">*.test.js</code> or specific file paths.</span>
        </div>
      </div>
    </Card>
  );
}