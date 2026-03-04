import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
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
        const descendantFiles = collectFileDescendants(sourceNode);
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
      const descendantFiles = collectFileDescendants(sourceNode);
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
      </div>
    );
  },
);

FileTreeView.displayName = "FileTreeView";

export default React.memo(FileTreeView);
