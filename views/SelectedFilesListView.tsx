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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useCodemapExtractor } from "@/services/codemapServiceHooks";
import { useAppStore } from "@/stores/useAppStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { CodemapResponse, FileData } from "@/types";

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
  ts: <File className="h-4 w-4 text-[rgb(var(--color-primary))]" />,
  tsx: <File className="h-4 w-4 text-[rgb(var(--color-primary))]" />,
  js: <File className="h-4 w-4 text-[rgb(var(--color-accent-3))]" />,
  jsx: <File className="h-4 w-4 text-[rgb(var(--color-accent-3))]" />,
  py: <File className="h-4 w-4 text-[rgb(var(--color-secondary))]" />,
  rb: <File className="h-4 w-4 text-[rgb(var(--color-error))]" />,
  php: <File className="h-4 w-4 text-[rgb(var(--color-tertiary))]" />,
  json: <File className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
  yml: <File className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
  yaml: <File className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
  xml: <File className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
  md: <File className="h-4 w-4 text-[rgb(var(--color-text-primary))]" />,
  txt: <File className="h-4 w-4 text-[rgb(var(--color-text-secondary))]" />,
  css: <File className="h-4 w-4 text-[rgb(var(--color-accent-2))]" />,
  scss: <File className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
  html: <File className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
};

const getExtensionIcon = (path: string): ReactNode => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_ICON_MAP[ext] ?? <File className="h-4 w-4 text-[rgb(var(--color-text-secondary))]" />;
};

const matchesExtension = (path: string, filters: string[]) => {
  if (filters.length === 0) return true;
  const lower = path.toLowerCase();
  return filters.some((filter) => {
    const normalized = filter.startsWith(".") ? filter.toLowerCase() : `.${filter.toLowerCase()}`;
    return lower.endsWith(normalized);
  });
};

const computeSelectionSummary = (
  selectedPaths: string[],
  filesData: FileData[],
  extensionFilters: string[],
  sortMode: SortMode,
): SelectionSummary => {
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

  const files =
    sortMode === "tokens"
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
};

const filterByCodemapPresence = (result: CodemapResponse): string[] => {
  return Object.entries(result)
    .filter(([, info]) => info.classes.length + info.functions.length > 0)
    .map(([file]) => file);
};

export default function SelectedFilesListView() {
  const selectedFilePaths = useProjectStore((state) => state.selectedFilePaths);
  const setSelectedFilePaths = useProjectStore((state) => state.setSelectedFilePaths);
  const filesData = useProjectStore((state) => state.filesData);

  const extensionFilters = useExclusionStore((state) => state.extensionFilters);
  const codemapFilterEmpty = useAppStore((state) => state.codemapFilterEmpty);
  const openCodemapModal = useAppStore((state) => state.openCodemapModal);

  const { trigger: extractCodemap, isMutating } = useCodemapExtractor();
  const [sortMode, setSortMode] = useState<SortMode>("name");

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
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[rgba(var(--color-border),0.45)] py-10 text-center text-sm text-[rgb(var(--color-text-muted))]">
        <Inbox className="h-8 w-8 opacity-70" />
        <p>{extensionFilters.length ? "No files match current filters." : "No files selected yet."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Layers size={13} />
          {summary.dirs.length > 0 ? `${summary.dirs.length} dir, ` : ""}
          {summary.files.length} file{summary.files.length === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <BarChart2 size={13} />
          {summary.totalTokens.toLocaleString()} tokens
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <FileText size={13} />
          {summary.totalChars.toLocaleString()} chars
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue placeholder="Sort files" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="inline-flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" className="h-8" disabled={isMutating || summary.files.length === 0} onClick={handlePreview}>
                  {isMutating ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      Extracting...
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
              <TooltipContent side="bottom">Extract codemap summaries for selected files.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScrollArea className="h-[220px] rounded-md border border-[rgba(var(--color-border),0.4)] bg-[rgba(var(--color-bg-secondary),0.25)] p-2">
        <ul className="space-y-2">
          {summary.dirs.map((dir) => (
            <li
              key={dir}
              className="flex items-center justify-between rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.45)] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Folder className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />
                <span className="truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">{dir}</span>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removePath(dir)}>
                <X size={14} />
              </Button>
            </li>
          ))}

          {summary.files.map((file) => (
            <li
              key={file.path}
              className="flex items-center justify-between rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.45)] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[rgba(var(--color-bg-secondary),0.5)]">
                  {getExtensionIcon(file.path)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">{file.path}</p>
                  <p className="text-xs text-[rgb(var(--color-text-muted))]">
                    {(file.tokenCount ?? 0).toLocaleString()} tokens · {file.content.length.toLocaleString()} chars
                  </p>
                </div>
              </div>

              <div className="ml-3 flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Code size={11} />
                  {(file.tokenCount ?? 0).toLocaleString()}
                </Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removePath(file.path)}>
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
