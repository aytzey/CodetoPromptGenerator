// FILE: views/SelectedFilesListView.tsx
// views/SelectedFilesListView.tsx
/**
 * Selected‑Files panel
 * ————————————————————————————————————
 * Displays the user’s current selection in a scroll‑area
 * and lets them:
 *   • inspect basic stats
 *   • preview a codemap
 *   • remove individual paths
 *   • (NEW) sort list alphabetically or by token‑count
 */

import React, { useMemo, useState } from "react";
import {
  File,
  Folder,
  X,
  Share2,
  Loader2,
  BarChart2,
  Inbox,
  SortAsc,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useProjectStore } from "@/stores/useProjectStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useAppStore } from "@/stores/useAppStore";

import { useCodemapExtractor } from "@/services/codemapServiceHooks";
// CodemapPreviewModal is now rendered globally, so it's not imported or rendered here directly.

import type { FileData } from "@/types";

/* ─────────────────────────────────────────────────── */
/* helpers */

const extIcon = (p: string) => {
  const ext = p.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": case "tsx": case "js": case "jsx": return <File className="h-4 w-4 mr-2 text-yellow-500 dark:text-yellow-400" />;
    case "py": case "rb": case "php": return <File className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />;
    case "json": case "yml": case "yaml": return <File className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />;
    default: return <File className="h-4 w-4 mr-2 text-teal-500 dark:text-teal-400" />;
  }
};

const matchesExt = (name: string, exts: string[]) =>
  exts.length === 0 ||
  exts.some((e) =>
    name.toLowerCase().endsWith(e.startsWith(".") ? e.toLowerCase() : `.${e}`),
  );

/* ─────────────────────────────────────────────────── */

export default function SelectedFilesListView() {
  /* — zustand state — */
  const selectedFilePaths = useProjectStore(s => s.selectedFilePaths);
  const setSelectedFilePaths = useProjectStore(s => s.setSelectedFilePaths);
  const filesData = useProjectStore(s => s.filesData);

  const extensionFilters = useExclusionStore(s => s.extensionFilters);
  const codemapFilterEmpty = useAppStore(s => s.codemapFilterEmpty);
  const openCodemapModal = useAppStore(s => s.openCodemapModal); // Get action from store


  /* — codemap extractor — */
  const {
    trigger: extractCodemap,
    // data: codemap, // SWR data is local to this hook call, modal uses store data
    isMutating,
  } = useCodemapExtractor();
  // showPreview and setShowPreview are removed as modal is global

  /* — local UI state — */
  const [sortMode, setSortMode] = useState<"name" | "tokens">("name");

  /* — derive directory & file lists — */
  const {
    dirs,
    files,
    totalTokens,
    totalChars,
    visibleCount,
    visiblePaths,
  } = useMemo(() => {
    const dirSet = new Set<string>();
    const loaded = new Map(filesData.map((f) => [f.path, f]));

    selectedFilePaths.forEach((p) => {
      if (loaded.has(p)) return; 
      dirSet.add(p);            
    });

    const rawFiles = [...loaded.values()].filter((f) =>
      matchesExt(f.path, extensionFilters),
    );

    const sortedFiles =
      sortMode === "tokens"
        ? [...rawFiles].sort((a, b) => (b.tokenCount ?? 0) - (a.tokenCount ?? 0))
        : [...rawFiles].sort((a, b) => a.path.localeCompare(b.path));

    return {
      dirs: [...dirSet].sort(),
      files: sortedFiles,
      totalTokens: rawFiles.reduce((a, f) => a + (f.tokenCount || 0), 0),
      totalChars: rawFiles.reduce((a, f) => a + f.content.length, 0),
      visibleCount: dirSet.size + rawFiles.length,
      visiblePaths: [...dirSet, ...rawFiles.map((f) => f.path)],
    };
  }, [selectedFilePaths, filesData, extensionFilters, sortMode]);

  const removePath = (p: string) =>
    setSelectedFilePaths(selectedFilePaths.filter((x) => x !== p));

  const handlePreview = async () => {
    const rel = visiblePaths.filter((p) => !p.endsWith("/"));
    const result = await extractCodemap({ paths: rel });
    if (result) {
      if (codemapFilterEmpty) {
        const keep = Object.entries(result)
          .filter(([, v]) => (v.classes.length + v.functions.length) > 0)
          .map(([file]) => file);
        const currentSelectedPaths = useProjectStore.getState().selectedFilePaths;
        setSelectedFilePaths(currentSelectedPaths.filter((p) => keep.includes(p)));
      }
      openCodemapModal(result); // Open global modal with data
    }
  };

  /* ─────────────────────────────── render ─────────────────────────────── */

  if (visibleCount === 0) {
    return (
      <div className="py-8 flex flex-col items-center text-gray-500 dark:text-gray-400">
        <Inbox className="h-10 w-10 mb-3 opacity-40" />
        {extensionFilters.length
          ? "No selected items match current extension filters."
          : "No files selected."}
      </div>
    );
  }

  return (
    <>
      {/* stats + actions header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="outline">
          {dirs.length > 0 && `${dirs.length} dir${dirs.length > 1 ? "s" : ""}, `}
          {files.length} file{files.length !== 1 && "s"}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <BarChart2 size={12} /> {totalTokens.toLocaleString()} tokens
        </Badge>
        <Badge variant="outline">{totalChars.toLocaleString()} chars</Badge>
        <Select value={sortMode} onValueChange={v => setSortMode(v as any)}>
          <SelectTrigger className="ml-auto h-7 w-[158px] text-xs border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
            <SortAsc size={12} className="mr-1" />
            <SelectValue placeholder="Sort files…" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="name">Alphabetical (A‑Z)</SelectItem>
            <SelectItem value="tokens">Token count (desc)</SelectItem>
          </SelectContent>
        </Select>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                disabled={isMutating || files.length === 0}
                onClick={handlePreview}
              >
                {isMutating ? (
                  <><Loader2 size={14} className="mr-1 animate-spin" />Extracting…</>
                ) : (
                  <><Share2 size={14} className="mr-1" />Preview Codemap</>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Inspect classes / functions without sending full file bodies.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* list */}
      <ScrollArea className="h-[180px] pr-3 border rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          {dirs.map((d) => (
            <li key={d} className="flex items-center justify-between px-3 py-1.5 bg-white/40 dark:bg-gray-900/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition">
              <span className="flex items-center truncate italic text-gray-600 dark:text-gray-400">
                <Folder className="h-4 w-4 mr-2 text-amber-500" />
                <span className="truncate font-mono">{d}</span>
              </span>
              <Button size="icon" variant="ghost" className="h-5 w-5 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400" aria-label={`Remove ${d}`} onClick={() => removePath(d)}>
                <X size={14} />
              </Button>
            </li>
          ))}
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between px-3 py-1.5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition">
              <span className="flex items-center truncate">
                {extIcon(f.path)}
                <span className="truncate font-mono">{f.path}</span>
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  {f.tokenCount}
                </Badge>
                <Button size="icon" variant="ghost" className="h-5 w-5 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400" aria-label={`Remove ${f.path}`} onClick={() => removePath(f.path)}>
                  <X size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
      {/* Codemap modal is no longer rendered here */}
    </>
  );
}