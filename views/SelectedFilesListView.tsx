// FILE: views/SelectedFilesListView.tsx
// views/SelectedFilesListView.tsx
/**
 * Selected‑Files panel - Enhanced with modern UI
 * ————————————————————————————————————
 * Displays the user's current selection with:
 *   • Beautiful glassmorphic cards
 *   • Smooth animations and transitions
 *   • Enhanced visual feedback
 *   • Modern color gradients
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
  Sparkles,
  Code,
  FileText,
  Layers,
  ArrowUpDown,
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
import type { FileData } from "@/types";

/* ─────────────────────────────────────────────────── */
/* helpers */

const extIcon = (p: string) => {
  const ext = p.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, JSX.Element> = {
    ts: <File className="h-4 w-4 text-[rgb(123,147,253)]" />,
    tsx: <File className="h-4 w-4 text-[rgb(123,147,253)]" />,
    js: <File className="h-4 w-4 text-[rgb(241,250,140)]" />,
    jsx: <File className="h-4 w-4 text-[rgb(241,250,140)]" />,
    py: <File className="h-4 w-4 text-[rgb(80,250,123)]" />,
    rb: <File className="h-4 w-4 text-[rgb(255,85,85)]" />,
    php: <File className="h-4 w-4 text-[rgb(189,147,249)]" />,
    json: <File className="h-4 w-4 text-[rgb(255,184,108)]" />,
    yml: <File className="h-4 w-4 text-[rgb(255,184,108)]" />,
    yaml: <File className="h-4 w-4 text-[rgb(255,184,108)]" />,
    xml: <File className="h-4 w-4 text-[rgb(255,184,108)]" />,
    md: <File className="h-4 w-4 text-[rgb(224,226,240)]" />,
    txt: <File className="h-4 w-4 text-[rgb(224,226,240)]" />,
    css: <File className="h-4 w-4 text-[rgb(139,233,253)]" />,
    scss: <File className="h-4 w-4 text-[rgb(255,121,198)]" />,
    html: <File className="h-4 w-4 text-[rgb(255,121,198)]" />,
  };
  return iconMap[ext || ""] || <File className="h-4 w-4 text-[rgb(190,192,210)]" />;
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
  const openCodemapModal = useAppStore(s => s.openCodemapModal);

  /* — codemap extractor — */
  const {
    trigger: extractCodemap,
    isMutating,
  } = useCodemapExtractor();

  /* — local UI state — */
  const [sortMode, setSortMode] = useState<"name" | "tokens">("name");
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

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
      openCodemapModal(result);
    }
  };

  /* ─────────────────────────────── render ─────────────────────────────── */

  if (visibleCount === 0) {
    return (
      <div className="py-12 flex flex-col items-center text-[rgb(var(--color-text-muted))] animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(var(--color-primary),0.2)] to-[rgba(var(--color-tertiary),0.2)] rounded-full blur-2xl animate-pulse"></div>
          <Inbox className="h-12 w-12 mb-4 opacity-60 relative z-10" />
        </div>
        <p className="text-base font-medium text-[rgb(var(--color-text-secondary))]">
          {extensionFilters.length
            ? "No files match current filters"
            : "No files selected"}
        </p>
        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
          Select files from the tree to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced stats header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Badge className="bg-gradient-to-r from-[rgba(var(--color-primary),0.15)] to-[rgba(var(--color-primary),0.05)] text-[rgb(var(--color-primary))] border border-[rgba(var(--color-primary),0.3)] px-3 py-1 shadow-sm">
            <Layers size={14} className="mr-1.5" />
            {dirs.length > 0 && `${dirs.length} dir${dirs.length > 1 ? "s" : ""}, `}
            {files.length} file{files.length !== 1 && "s"}
          </Badge>
          <Badge className="bg-gradient-to-r from-[rgba(var(--color-secondary),0.15)] to-[rgba(var(--color-secondary),0.05)] text-[rgb(var(--color-secondary))] border border-[rgba(var(--color-secondary),0.3)] px-3 py-1 shadow-sm">
            <BarChart2 size={14} className="mr-1.5" />
            {totalTokens.toLocaleString()} tokens
          </Badge>
          <Badge className="bg-gradient-to-r from-[rgba(var(--color-tertiary),0.15)] to-[rgba(var(--color-tertiary),0.05)] text-[rgb(var(--color-tertiary))] border border-[rgba(var(--color-tertiary),0.3)] px-3 py-1 shadow-sm">
            <FileText size={14} className="mr-1.5" />
            {totalChars.toLocaleString()} chars
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={sortMode} onValueChange={v => setSortMode(v as any)}>
            <SelectTrigger className="h-9 w-[180px] text-sm glass border-[rgba(var(--color-border),0.5)] text-[rgb(var(--color-text-primary))]">
              <ArrowUpDown size={14} className="mr-1.5 text-[rgb(var(--color-accent-2))]" />
              <SelectValue placeholder="Sort files…" />
            </SelectTrigger>
            <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
              <SelectItem value="name">
                <div className="flex items-center">
                  <SortAsc size={14} className="mr-2 text-[rgb(var(--color-primary))]" />
                  Alphabetical
                </div>
              </SelectItem>
              <SelectItem value="tokens">
                <div className="flex items-center">
                  <BarChart2 size={14} className="mr-2 text-[rgb(var(--color-secondary))]" />
                  Token Count
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  disabled={isMutating || files.length === 0}
                  onClick={handlePreview}
                  className="h-9 bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-accent-1))] text-white hover:shadow-glow-tertiary active-scale"
                >
                  {isMutating ? (
                    <><Loader2 size={14} className="mr-1.5 animate-spin" />Extracting…</>
                  ) : (
                    <>
                      <Sparkles size={14} className="mr-1.5" />
                      <Share2 size={14} className="mr-1.5" />
                      Preview Code
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass">
                <p>Extract and preview code structure</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Enhanced file list */}
      <ScrollArea className="h-[200px] pr-3 glass border-[rgba(var(--color-border),0.5)] rounded-xl">
        <ul className="p-2 space-y-1">
          {dirs.map((d, index) => (
            <li 
              key={d} 
              className="group relative rounded-lg transition-all duration-300 animate-slide-up hover-lift-sm"
              style={{ animationDelay: `${index * 30}ms` }}
              onMouseEnter={() => setHoveredPath(d)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <div className={`
                flex items-center justify-between px-3 py-2 rounded-lg
                ${hoveredPath === d 
                  ? 'bg-gradient-to-r from-[rgba(var(--color-accent-4),0.15)] to-[rgba(var(--color-accent-4),0.05)] border border-[rgba(var(--color-accent-4),0.3)]' 
                  : 'bg-[rgba(var(--color-bg-secondary),0.3)] border border-transparent'
                }
                transition-all duration-200
              `}>
                <span className="flex items-center truncate">
                  <div className="p-1.5 rounded-md bg-[rgba(var(--color-accent-4),0.15)] mr-2">
                    <Folder className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />
                  </div>
                  <span className="truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">{d}</span>
                </span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[rgba(var(--color-error),0.15)] hover:text-[rgb(var(--color-error))]" 
                  onClick={() => removePath(d)}
                >
                  <X size={14} />
                </Button>
              </div>
            </li>
          ))}
          
          {files.map((f, index) => (
            <li 
              key={f.path} 
              className="group relative rounded-lg transition-all duration-300 animate-slide-up hover-lift-sm"
              style={{ animationDelay: `${(dirs.length + index) * 30}ms` }}
              onMouseEnter={() => setHoveredPath(f.path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <div className={`
                flex items-center justify-between px-3 py-2 rounded-lg
                ${hoveredPath === f.path 
                  ? 'bg-gradient-to-r from-[rgba(var(--color-primary),0.15)] to-[rgba(var(--color-primary),0.05)] border border-[rgba(var(--color-primary),0.3)]' 
                  : 'bg-[rgba(var(--color-bg-secondary),0.3)] border border-transparent'
                }
                transition-all duration-200
              `}>
                <span className="flex items-center truncate">
                  <div className="p-1.5 rounded-md bg-[rgba(var(--color-primary),0.1)] mr-2">
                    {extIcon(f.path)}
                  </div>
                  <span className="truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">{f.path}</span>
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className="px-2 py-0.5 text-xs bg-gradient-to-r from-[rgba(var(--color-tertiary),0.15)] to-[rgba(var(--color-tertiary),0.05)] text-[rgb(var(--color-tertiary))] border border-[rgba(var(--color-tertiary),0.3)]">
                    {f.tokenCount}
                  </Badge>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[rgba(var(--color-error),0.15)] hover:text-[rgb(var(--color-error))]" 
                    onClick={() => removePath(f.path)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
              
              {/* Progress bar showing relative token size */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[rgba(var(--color-border),0.2)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-accent-1))] transition-all duration-500"
                  style={{ width: `${Math.min(100, (f.tokenCount / 3000) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </>
  );
}