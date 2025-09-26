import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowUpDown,
  BarChart2,
  Code,
  File,
  FileText,
  Folder,
  Inbox,
  Layers,
  Loader2,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useCodemapExtractor } from "@/services/codemapServiceHooks";
import { useAppStore } from "@/stores/useAppStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { CodemapResponse, FileData } from "@/types";

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

type SortMode = "name" | "tokens";

interface SelectionSummary {
  dirs: string[];
  files: FileData[];
  totalTokens: number;
  totalChars: number;
  visiblePaths: string[];
}

const SORT_OPTIONS: Array<{ value: SortMode; label: string; icon: ReactNode }> = [
  { value: "name", label: "File name", icon: <ArrowUpDown size={14} /> },
  { value: "tokens", label: "Token count", icon: <BarChart2 size={14} /> },
];

const EXTENSION_ICON_MAP: Record<string, ReactNode> = {
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

function getExtensionIcon(path: string): ReactNode {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_ICON_MAP[ext] ?? (
    <File className="h-4 w-4 text-[rgb(190,192,210)]" />
  );
}

function matchesExtension(path: string, filters: string[]) {
  if (filters.length === 0) return true;
  const lower = path.toLowerCase();
  return filters.some((pattern) => {
    const normalised = pattern.startsWith(".")
      ? pattern.toLowerCase()
      : `.${pattern.toLowerCase()}`;
    return lower.endsWith(normalised);
  });
}

function computeSelectionSummary(
  selectedPaths: string[],
  filesData: FileData[],
  extensionFilters: string[],
  sortMode: SortMode,
): SelectionSummary {
  const fileMap = new Map(filesData.map((file) => [file.path, file]));
  const dirs = new Set<string>();
  const filteredFiles: FileData[] = [];

  selectedPaths.forEach((path) => {
    const file = fileMap.get(path);
    if (!file) {
      dirs.add(path);
      return;
    }
    if (matchesExtension(file.path, extensionFilters)) {
      filteredFiles.push(file);
    }
  });

  const files = sortMode === "tokens"
    ? filteredFiles.sort((a, b) => (b.tokenCount ?? 0) - (a.tokenCount ?? 0))
    : filteredFiles.sort((a, b) => a.path.localeCompare(b.path));

  const totalTokens = files.reduce((total, file) => total + (file.tokenCount ?? 0), 0);
  const totalChars = files.reduce((total, file) => total + file.content.length, 0);
  const sortedDirs = Array.from(dirs).sort();
  const visiblePaths = [...sortedDirs, ...files.map((file) => file.path)];

  return {
    dirs: sortedDirs,
    files,
    totalTokens,
    totalChars,
    visiblePaths,
  };
}

function filterByCodemapPresence(result: CodemapResponse): string[] {
  return Object.entries(result)
    .filter(([, info]) => (info.classes.length + info.functions.length) > 0)
    .map(([file]) => file);
}

/* -------------------------------------------------------------------------- */
/* component                                                                  */
/* -------------------------------------------------------------------------- */

export default function SelectedFilesListView() {
  const selectedFilePaths = useProjectStore((state) => state.selectedFilePaths);
  const setSelectedFilePaths = useProjectStore((state) => state.setSelectedFilePaths);
  const filesData = useProjectStore((state) => state.filesData);

  const extensionFilters = useExclusionStore((state) => state.extensionFilters);
  const codemapFilterEmpty = useAppStore((state) => state.codemapFilterEmpty);
  const openCodemapModal = useAppStore((state) => state.openCodemapModal);

  const { trigger: extractCodemap, isMutating } = useCodemapExtractor();

  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const summary = useMemo(
    () => computeSelectionSummary(selectedFilePaths, filesData, extensionFilters, sortMode),
    [selectedFilePaths, filesData, extensionFilters, sortMode],
  );

  const removePath = useCallback(
    (path: string) => {
      setSelectedFilePaths(selectedFilePaths.filter((item) => item !== path));
    },
    [selectedFilePaths, setSelectedFilePaths],
  );

  const handlePreview = useCallback(async () => {
    const filesOnly = summary.visiblePaths.filter((path) => !path.endsWith("/"));
    if (filesOnly.length === 0) return;

    const result = await extractCodemap({ paths: filesOnly });
    if (!result) return;

    if (codemapFilterEmpty) {
      const keep = filterByCodemapPresence(result);
      const latestSelection = useProjectStore.getState().selectedFilePaths;
      setSelectedFilePaths(latestSelection.filter((path) => keep.includes(path)));
    }

    openCodemapModal(result);
  }, [summary.visiblePaths, extractCodemap, codemapFilterEmpty, setSelectedFilePaths, openCodemapModal]);

  if (summary.dirs.length + summary.files.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-[rgb(var(--color-text-muted))] animate-fade-in">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[rgba(var(--color-primary),0.2)] to-[rgba(var(--color-tertiary),0.2)] blur-2xl" />
          <Inbox className="relative h-12 w-12" />
        </div>
        <p className="text-base font-medium text-[rgb(var(--color-text-secondary))]">
          {extensionFilters.length ? "No files match current filters" : "No files selected"}
        </p>
        <p className="mt-1 text-sm opacity-80">Select files from the tree to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Badge className="bg-gradient-to-r from-[rgba(var(--color-primary),0.15)] to-[rgba(var(--color-primary),0.05)] text-[rgb(var(--color-primary))] border border-[rgba(var(--color-primary),0.3)] px-3 py-1 shadow-sm">
            <Layers size={14} className="mr-1.5" />
            {summary.dirs.length > 0 && `${summary.dirs.length} dir${summary.dirs.length > 1 ? "s" : ""}, `}
            {summary.files.length} file{summary.files.length === 1 ? "" : "s"}
          </Badge>
          <Badge className="bg-gradient-to-r from-[rgba(var(--color-secondary),0.15)] to-[rgba(var(--color-secondary),0.05)] text-[rgb(var(--color-secondary))] border border-[rgba(var(--color-secondary),0.3)] px-3 py-1 shadow-sm">
            <BarChart2 size={14} className="mr-1.5" />
            {summary.totalTokens.toLocaleString()} tokens
          </Badge>
          <Badge className="bg-gradient-to-r from-[rgba(var(--color-tertiary),0.15)] to-[rgba(var(--color-tertiary),0.05)] text-[rgb(var(--color-tertiary))] border border-[rgba(var(--color-tertiary),0.3)] px-3 py-1 shadow-sm">
            <FileText size={14} className="mr-1.5" />
            {summary.totalChars.toLocaleString()} chars
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-9 w-[190px] glass border-[rgba(var(--color-border),0.5)] text-sm">
              <SelectValue placeholder="Sort files…">
                <div className="flex items-center gap-2">
                  {SORT_OPTIONS.find((option) => option.value === sortMode)?.icon}
                  {SORT_OPTIONS.find((option) => option.value === sortMode)?.label}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  disabled={isMutating || summary.files.length === 0}
                  onClick={handlePreview}
                  className="h-9 bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-accent-1))] text-white hover:shadow-glow-tertiary"
                >
                  {isMutating ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />Extracting…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="mr-1.5" />
                      <Share2 size={14} className="mr-1.5" />
                      Preview code
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass">
                Extract codemap summaries for current selection
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="h-[220px] rounded-xl border border-[rgba(var(--color-border),0.4)] bg-[rgba(var(--color-bg-secondary),0.3)] p-2">
        <ul className="space-y-2">
          {summary.dirs.map((dir) => (
            <li
              key={dir}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                hoveredPath === dir
                  ? "border-[rgba(var(--color-accent-4),0.4)] bg-[rgba(var(--color-accent-4),0.12)]"
                  : "border-transparent"
              }`}
              onMouseEnter={() => setHoveredPath(dir)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <div className="flex items-center gap-2 truncate">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(var(--color-accent-4),0.15)]">
                  <Folder className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />
                </div>
                <span className="truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">
                  {dir}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removePath(dir)}
                className="h-7 w-7 text-[rgb(var(--color-text-muted))] hover:bg-rose-500/15 hover:text-rose-400"
              >
                <X size={14} />
              </Button>
            </li>
          ))}

          {summary.files.map((file) => (
            <li
              key={file.path}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                hoveredPath === file.path
                  ? "border-[rgba(var(--color-primary),0.4)] bg-[rgba(var(--color-primary),0.12)]"
                  : "border-transparent"
              }`}
              onMouseEnter={() => setHoveredPath(file.path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(var(--color-primary),0.12)]">
                  {getExtensionIcon(file.path)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">
                    {file.path}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-text-muted))]">
                    {(file.tokenCount ?? 0).toLocaleString()} tokens · {file.content.length.toLocaleString()} chars
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="px-2 py-0.5 text-xs bg-gradient-to-r from-[rgba(var(--color-tertiary),0.15)] to-[rgba(var(--color-tertiary),0.05)] text-[rgb(var(--color-tertiary))] border border-[rgba(var(--color-tertiary),0.3)]">
                  <Code size={12} className="mr-1" />
                  {file.tokenCount ?? 0}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removePath(file.path)}
                  className="h-7 w-7 text-[rgb(var(--color-text-muted))] hover:bg-rose-500/15 hover:text-rose-400"
                >
                  <X size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
