import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import type { ReactElement } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  File,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { findNodeByPath } from "@/lib/fileFilters";
import { filterPromptSelectablePaths, normalizeExclusionPattern } from "@/lib/selectionFilters";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useExclusionStore } from "@/stores/useExclusionStore";
import type { FileNode } from "@/types";

export interface FileTreeViewHandle {
  collapseAll(): void;
  expandAll(): void;
}

interface FileTreeViewProps {
  tree: FileNode[];
  fullTree: FileNode[];
  selectedFiles: string[];
  onSelectFiles(paths: string[]): void;
}

interface TreeRow {
  node: FileNode;
  depth: number;
}

const ROW_HEIGHT = 36;
const CONTEXT_MENU_WIDTH = 260;
const CONTEXT_MENU_HEIGHT = 92;

type ContextMenuState = {
  x: number;
  y: number;
  node: FileNode;
};

type ToastFn = (message: string, options?: { variant?: "default" | "success" | "error" }) => void;

const toast = (message: string, variant: "default" | "success" | "error" = "default") => {
  if (typeof window === "undefined") return;
  const maybeToast = (window as Window & { toast?: ToastFn }).toast;
  maybeToast?.(message, { variant });
};

const collectFileDescendants = (node: FileNode): string[] => {
  if (node.type === "file") return [node.relativePath];
  if (!node.children?.length) return [];
  return node.children.flatMap(collectFileDescendants);
};

const sortNodes = (nodes: FileNode[]): FileNode[] =>
  [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

const getFileIcon = (path: string): ReactElement => {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const iconMap: Record<string, ReactElement> = {
    ts: <Code className="h-4 w-4 text-[rgb(var(--color-primary))]" />,
    tsx: <Code className="h-4 w-4 text-[rgb(var(--color-primary))]" />,
    js: <Code className="h-4 w-4 text-[rgb(var(--color-accent-3))]" />,
    jsx: <Code className="h-4 w-4 text-[rgb(var(--color-accent-3))]" />,
    py: <Code className="h-4 w-4 text-[rgb(var(--color-secondary))]" />,
    json: <Database className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
    yml: <Database className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
    yaml: <Database className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
    md: <FileText className="h-4 w-4 text-[rgb(var(--color-text-primary))]" />,
    txt: <FileText className="h-4 w-4 text-[rgb(var(--color-text-secondary))]" />,
    png: <ImageIcon className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
    jpg: <ImageIcon className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
    jpeg: <ImageIcon className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
    svg: <ImageIcon className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
    git: <GitBranch className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
    lock: <Package className="h-4 w-4 text-[rgb(var(--color-text-muted))]" />,
  };
  return iconMap[extension] ?? <File className="h-4 w-4 text-[rgb(var(--color-text-secondary))]" />;
};

const FileTreeView = forwardRef<FileTreeViewHandle, FileTreeViewProps>(
  ({ tree, fullTree, selectedFiles, onSelectFiles }, ref) => {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const contextMenuRef = useRef<HTMLDivElement | null>(null);
    const localExclusions = useExclusionStore((state) => state.localExclusions);
    const isSavingLocal = useExclusionStore((state) => state.isSavingLocal);
    const { updateLocalExclusions } = useExclusionService();

    useImperativeHandle(
      ref,
      () => ({
        collapseAll() {
          const directories = new Set<string>();
          const walk = (nodes: FileNode[]) => {
            nodes.forEach((node) => {
              if (node.type !== "directory") return;
              directories.add(node.absolutePath);
              if (node.children) walk(node.children);
            });
          };
          walk(tree);
          setCollapsed(directories);
        },
        expandAll() {
          setCollapsed(new Set());
        },
      }),
      [tree],
    );

    const toggleCollapse = useCallback((absolutePath: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(absolutePath)) {
          next.delete(absolutePath);
        } else {
          next.add(absolutePath);
        }
        return next;
      });
    }, []);

    useEffect(() => {
      if (!contextMenu) return;

      const closeOnPointerDown = (event: MouseEvent) => {
        if (contextMenuRef.current?.contains(event.target as Node)) return;
        setContextMenu(null);
      };
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setContextMenu(null);
      };
      const close = () => setContextMenu(null);

      window.addEventListener("mousedown", closeOnPointerDown);
      window.addEventListener("keydown", closeOnEscape);
      window.addEventListener("resize", close);
      window.addEventListener("scroll", close, true);

      return () => {
        window.removeEventListener("mousedown", closeOnPointerDown);
        window.removeEventListener("keydown", closeOnEscape);
        window.removeEventListener("resize", close);
        window.removeEventListener("scroll", close, true);
      };
    }, [contextMenu]);

    const openContextMenu = useCallback((event: React.MouseEvent, node: FileNode) => {
      event.preventDefault();
      event.stopPropagation();

      const x = Math.max(8, Math.min(event.clientX, window.innerWidth - CONTEXT_MENU_WIDTH - 8));
      const y = Math.max(8, Math.min(event.clientY, window.innerHeight - CONTEXT_MENU_HEIGHT - 8));
      setContextMenu({ x, y, node });
    }, []);

    const addContextNodeToLocalExclusions = useCallback(async () => {
      if (!contextMenu || isSavingLocal) return;

      const path = normalizeExclusionPattern(contextMenu.node.relativePath);
      if (!path) {
        setContextMenu(null);
        return;
      }

      if (localExclusions.includes(path)) {
        toast("Already in project exclusions.");
        setContextMenu(null);
        return;
      }

      const success = await updateLocalExclusions([...localExclusions, path]);
      if (success) {
        toast("Added to project exclusions.", "success");
      }
      setContextMenu(null);
    }, [contextMenu, isSavingLocal, localExclusions, updateLocalExclusions]);

    const flatten = useCallback(
      (nodes: FileNode[], depth = 0): TreeRow[] => {
        return sortNodes(nodes).flatMap((node) => {
          const rows: TreeRow[] = [{ node, depth }];
          if (
            node.type === "directory" &&
            node.children &&
            !collapsed.has(node.absolutePath)
          ) {
            rows.push(...flatten(node.children, depth + 1));
          }
          return rows;
        });
      },
      [collapsed],
    );

    const rows = useMemo(() => flatten(tree), [flatten, tree]);
    const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);

    const toggleSelection = useCallback(
      (node: FileNode) => {
        const sourceNode = findNodeByPath(fullTree, node.relativePath) ?? node;
        const descendantFiles = filterPromptSelectablePaths(collectFileDescendants(sourceNode));
        if (descendantFiles.length === 0) return;

        const next = new Set(selectedSet);
        const allSelected = descendantFiles.every((path) => next.has(path));
        descendantFiles.forEach((path) => {
          if (allSelected) {
            next.delete(path);
          } else {
            next.add(path);
          }
        });

        onSelectFiles(Array.from(next));
      },
      [fullTree, selectedSet, onSelectFiles],
    );

    const RowRenderer = ({ index, style }: ListChildComponentProps) => {
      const { node, depth } = rows[index];
      const isDirectory = node.type === "directory";
      const isOpen = isDirectory && !collapsed.has(node.absolutePath);
      const sourceNode = findNodeByPath(fullTree, node.relativePath) ?? node;
      const descendantFiles = filterPromptSelectablePaths(collectFileDescendants(sourceNode));
      const isEmpty = descendantFiles.length === 0;
      const allSelected = !isEmpty && descendantFiles.every((path) => selectedSet.has(path));
      const partiallySelected =
        !isEmpty &&
        !allSelected &&
        descendantFiles.some((path) => selectedSet.has(path));
      const checkboxState: boolean | "indeterminate" = allSelected
        ? true
        : partiallySelected
          ? "indeterminate"
          : false;

      return (
        <div
          style={{ ...style, paddingLeft: `${depth * 18 + 8}px` }}
          className={cn(
            "group flex items-center gap-2 pr-3 transition-colors",
            "hover:bg-[rgba(var(--color-primary),0.06)]",
            allSelected && "bg-[rgba(var(--color-primary),0.1)]",
          )}
          onContextMenu={(event) => openContextMenu(event, node)}
        >
          {isDirectory ? (
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[rgb(var(--color-text-muted))] hover:bg-[rgba(var(--color-border),0.35)]"
              onClick={() => toggleCollapse(node.absolutePath)}
              aria-label={isOpen ? "Collapse folder" : "Expand folder"}
            >
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : (
            <span className="inline-block w-6" />
          )}

          <Checkbox
            id={`tree-node-${node.absolutePath}`}
            checked={checkboxState}
            onCheckedChange={() => toggleSelection(node)}
            disabled={isEmpty}
            className="rounded-sm"
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  htmlFor={`tree-node-${node.absolutePath}`}
                  className={cn(
                    "flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm",
                    isDirectory
                      ? "text-[rgb(var(--color-accent-4))]"
                      : "text-[rgb(var(--color-text-primary))]",
                    isEmpty && "opacity-55",
                  )}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[rgba(var(--color-bg-secondary),0.55)]">
                    {isDirectory ? (
                      isOpen ? <FolderOpen size={15} /> : <Folder size={15} />
                    ) : (
                      getFileIcon(node.name)
                    )}
                  </span>
                  <span className="truncate">{node.name}</span>
                </label>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-mono text-xs">
                {node.relativePath}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isDirectory && node.children?.length ? (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {node.children.length}
            </Badge>
          ) : null}
        </div>
      );
    };

    if (rows.length === 0) {
      return (
        <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-[rgba(var(--color-border),0.4)] text-sm text-[rgb(var(--color-text-muted))]">
          No files to display.
        </div>
      );
    }

    return (
      <div className="h-[400px] rounded-md border border-[rgba(var(--color-border),0.4)] bg-[rgba(var(--color-bg-secondary),0.2)] p-1">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={rows.length}
              itemSize={ROW_HEIGHT}
              overscanCount={12}
              className="custom-scrollbar"
            >
              {RowRenderer}
            </List>
          )}
        </AutoSizer>
        {contextMenu ? (
          <div
            ref={contextMenuRef}
            className="fixed z-50 w-[260px] rounded-md border border-[rgba(var(--color-border),0.55)] bg-[rgb(var(--color-bg-primary))] p-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
          >
            <div className="truncate border-b border-[rgba(var(--color-border),0.35)] px-3 py-2 font-mono text-[11px] text-[rgb(var(--color-text-muted))]">
              {contextMenu.node.relativePath}
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[rgb(var(--color-text-primary))] hover:bg-[rgba(var(--color-primary),0.08)] disabled:cursor-not-allowed disabled:opacity-55"
              onClick={addContextNodeToLocalExclusions}
              disabled={
                isSavingLocal ||
                localExclusions.includes(normalizeExclusionPattern(contextMenu.node.relativePath) ?? "")
              }
              role="menuitem"
            >
              {contextMenu.node.type === "directory" ? <Folder size={15} /> : <File size={15} />}
              <span>
                {localExclusions.includes(normalizeExclusionPattern(contextMenu.node.relativePath) ?? "")
                  ? "Already in local exclusions"
                  : "Add to local exclusions"}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    );
  },
);

FileTreeView.displayName = "FileTreeView";

export default React.memo(FileTreeView);
