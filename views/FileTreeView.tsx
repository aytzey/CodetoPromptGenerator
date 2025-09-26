// views/FileTreeView.tsx
/**
 * Virtualised file‑tree · Enhanced with modern UI
 * ──────────────────────────────────────────────────
 *   • Beautiful hover effects and animations
 *   • Improved visual hierarchy
 *   • Modern color scheme
 *   • Smooth transitions
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import type { ReactElement } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  FolderOpen,
  GitBranch,
  Code,
  Database,
  Image,
  FileText,
  Package,
} from "lucide-react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/types";
import { findNodeByPath } from "@/lib/fileFilters";

/* ─────────── helpers ─────────── */

const collectFileDescendants = (node: FileNode): string[] => {
  if (node.type === "file") return [node.relativePath];
  if (!node.children?.length) return [];
  return node.children.flatMap(collectFileDescendants);
};

/* ─────────── public interface ─────────── */
export interface FileTreeViewHandle {
  collapseAll(): void;
  expandAll(): void;
}

interface Props {
  tree: FileNode[];
  fullTree: FileNode[];
  selectedFiles: string[];
  onSelectFiles(paths: string[]): void;
}

interface Row {
  node: FileNode;
  depth: number;
}

const ROW_HEIGHT = 36;

const FileTreeView = forwardRef<FileTreeViewHandle, Props>(
  ({ tree, fullTree, selectedFiles, onSelectFiles }, ref) => {
    /* — state — */
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [hoveredRow, setHoveredRow] = useState<string | null>(null);

    /* — imperative API — */
    useImperativeHandle(
      ref,
      () => ({
        collapseAll() {
          const dirs = new Set<string>();
          const walk = (n: FileNode[]) =>
            n.forEach((node) => {
              if (node.type === "directory") {
                dirs.add(node.absolutePath);
                node.children && walk(node.children);
              }
            });
          walk(tree);
          setCollapsed(dirs);
        },
        expandAll() {
          setCollapsed(new Set());
        },
      }),
      [tree],
    );

    /* — helpers — */
    const toggleCollapse = useCallback(
      (absPath: string) =>
        setCollapsed((s) => {
          const next = new Set(s);
          next.has(absPath) ? next.delete(absPath) : next.add(absPath);
          return next;
        }),
      [],
    );

    const flatten = useCallback(
      (nodes: FileNode[], depth = 0): Row[] => {
        // Sort nodes: directories first, then files, both alphabetically
        const sortedNodes = [...nodes].sort((a, b) => {
          // First sort by type (directories before files)
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          // Then sort alphabetically by name (case-insensitive)
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        
        return sortedNodes.flatMap((n) => {
          const rows: Row[] = [{ node: n, depth }];
          if (
            n.type === "directory" &&
            n.children &&
            !collapsed.has(n.absolutePath)
          ) {
            rows.push(...flatten(n.children, depth + 1));
          }
          return rows;
        });
      },
      [collapsed],
    );

    /* — derived — */
    const rows = useMemo(() => flatten(tree), [flatten, tree]);
    const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);

    const toggleSelection = (n: FileNode) => {
      const origin =
        findNodeByPath(fullTree, n.relativePath) ?? n;

      const pathsToToggle = collectFileDescendants(origin);
      if (!pathsToToggle.length) return;

      const next = new Set(selectedSet);
      const currentlyAllSelected = pathsToToggle.every((p) => next.has(p));

      pathsToToggle.forEach((p) =>
        currentlyAllSelected ? next.delete(p) : next.add(p),
      );
      onSelectFiles(Array.from(next));
    };

    /* — icon helpers — */
    const getFileIcon = (path: string) => {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      
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
        png: <Image className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
        jpg: <Image className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
        jpeg: <Image className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
        svg: <Image className="h-4 w-4 text-[rgb(var(--color-accent-1))]" />,
        git: <GitBranch className="h-4 w-4 text-[rgb(var(--color-accent-4))]" />,
        lock: <Package className="h-4 w-4 text-[rgb(var(--color-text-muted))]" />,
      };
      
      return iconMap[ext] || <File className="h-4 w-4 text-[rgb(var(--color-text-secondary))]" />;
    };

    const getFileColour = (ext: string) => {
      const colorMap: Record<string, string> = {
        ts: "text-[rgb(var(--color-primary))]",
        tsx: "text-[rgb(var(--color-primary))]",
        js: "text-[rgb(var(--color-accent-3))]",
        jsx: "text-[rgb(var(--color-accent-3))]",
        py: "text-[rgb(var(--color-secondary))]",
        rb: "text-[rgb(var(--color-error))]",
        php: "text-[rgb(var(--color-tertiary))]",
        json: "text-[rgb(var(--color-accent-4))]",
        yml: "text-[rgb(var(--color-accent-4))]",
        yaml: "text-[rgb(var(--color-accent-4))]",
        xml: "text-[rgb(var(--color-accent-4))]",
        md: "text-[rgb(var(--color-text-primary))]",
        txt: "text-[rgb(var(--color-text-secondary))]",
        css: "text-[rgb(var(--color-accent-2))]",
        scss: "text-[rgb(var(--color-accent-1))]",
        html: "text-[rgb(var(--color-accent-1))]",
      };
      
      return colorMap[ext] || "text-[rgb(var(--color-text-secondary))]";
    };

    /* — render row — */
    const RowRenderer = ({ index, style }: ListChildComponentProps) => {
      const { node, depth } = rows[index];
      const isDir = node.type === "directory";
      const isOpen = isDir && !collapsed.has(node.absolutePath);
      const rowId = node.absolutePath;

      const selectableFiles = useMemo(() => {
        const origin = findNodeByPath(fullTree, node.relativePath) ?? node;
        return collectFileDescendants(origin);
      }, [node, fullTree]);
      
      const isEmpty = selectableFiles.length === 0;
      const checked = !isEmpty && selectableFiles.every((p) => selectedSet.has(p));
      const partial = !isEmpty && !checked && selectableFiles.some((p) => selectedSet.has(p));
      const isHovered = hoveredRow === rowId;

      const fileExt = node.type === "file" ? node.name.split(".").pop()?.toLowerCase() ?? "" : "";

      return (
        <div
          style={{ ...style, paddingLeft: depth * 1.5 + "rem" }}
          className={cn(
            "flex items-center pr-3 relative group transition-all duration-200",
            isHovered && "bg-gradient-to-r from-[rgba(var(--color-primary),0.05)] to-transparent",
            checked && !isEmpty && "bg-gradient-to-r from-[rgba(var(--color-primary),0.1)] to-[rgba(var(--color-primary),0.05)]",
          )}
          onMouseEnter={() => setHoveredRow(rowId)}
          onMouseLeave={() => setHoveredRow(null)}
        >
          {/* Selection indicator */}
          {checked && !isEmpty && (
            <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))]" />
          )}

          {/* Collapse/expand button */}
          {isDir ? (
            <button
              className={cn(
                "mr-1.5 p-1 rounded-md text-[rgb(var(--color-text-muted))] transition-all duration-200",
                isHovered && "text-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.1)]",
              )}
              onClick={() => toggleCollapse(node.absolutePath)}
            >
              {collapsed.has(node.absolutePath) ? (
                <ChevronRight size={16} className="transition-transform duration-200" />
              ) : (
                <ChevronDown size={16} className="transition-transform duration-200" />
              )}
            </button>
          ) : (
            <span className="mr-7" />
          )}

          {/* Enhanced checkbox */}
          <div className="mr-2.5">
            <Checkbox
              id={`chk-${node.absolutePath}`}
              checked={checked}
              data-state={partial ? "indeterminate" : checked ? "checked" : "unchecked"}
              onCheckedChange={() => toggleSelection(node)}
              disabled={isEmpty}
              className={cn(
                "rounded-md transition-all duration-200 shadow-sm",
                "data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-[rgb(var(--color-primary))] data-[state=checked]:to-[rgb(var(--color-tertiary))]",
                "data-[state=indeterminate]:bg-gradient-to-br data-[state=indeterminate]:from-[rgba(var(--color-primary),0.7)] data-[state=indeterminate]:to-[rgba(var(--color-tertiary),0.7)]",
                "hover:shadow-md",
                isEmpty && "opacity-30 cursor-not-allowed",
              )}
            />
          </div>

          {/* Icon + name with enhanced styling */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  htmlFor={`chk-${node.absolutePath}`}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer font-medium transition-all duration-200 flex-1 min-w-0",
                    isDir
                      ? "text-[rgb(var(--color-accent-4))]"
                      : getFileColour(fileExt),
                    isEmpty && "opacity-60",
                    isHovered && "translate-x-0.5",
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-md transition-all duration-200",
                    isHovered ? "bg-[rgba(var(--color-primary),0.1)]" : "bg-[rgba(var(--color-bg-tertiary),0.5)]",
                  )}>
                    {isDir ? (
                      isOpen ? (
                        <FolderOpen size={16} className="shrink-0" />
                      ) : (
                        <Folder size={16} className="shrink-0" />
                      )
                    ) : (
                      getFileIcon(node.name)
                    )}
                  </div>
                  <span className="truncate text-sm">{node.name}</span>
                </label>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass font-mono text-xs max-w-sm">
                <p className="break-all">{node.relativePath}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Enhanced directory badge */}
          {isDir && node.children?.length ? (
            <Badge
              className={cn(
                "ml-auto text-xs py-0.5 px-2 font-normal transition-all duration-200",
                isHovered 
                  ? "bg-gradient-to-r from-[rgba(var(--color-accent-4),0.2)] to-[rgba(var(--color-accent-4),0.1)] text-[rgb(var(--color-accent-4))] border-[rgba(var(--color-accent-4),0.3)]"
                  : "bg-[rgba(var(--color-bg-tertiary),0.5)] text-[rgb(var(--color-text-muted))] border-[rgba(var(--color-border),0.3)]",
              )}
            >
              {node.children.length}
            </Badge>
          ) : null}

          {/* Hover effect line */}
          {isHovered && (
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-primary),0.3)] to-transparent" />
          )}
        </div>
      );
    };

    /* — empty state — */
    if (!rows.length)
      return (
        <div className="flex flex-col items-center justify-center h-full py-16 text-[rgb(var(--color-text-muted))] animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(var(--color-primary),0.2)] to-[rgba(var(--color-tertiary),0.2)] rounded-full blur-3xl animate-pulse"></div>
            <Folder size={56} className="mb-4 opacity-50 relative z-10" />
          </div>
          <p className="text-lg font-medium text-[rgb(var(--color-text-secondary))]">No files to display</p>
          {tree.length > 0 && (
            <p className="text-sm mt-2 text-[rgb(var(--color-accent-1))]">
              Try adjusting your filters
            </p>
          )}
        </div>
      );

    /* — main render — */
    return (
      <div className="h-[400px] glass rounded-lg p-1">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={rows.length}
              itemSize={ROW_HEIGHT}
              overscanCount={10}
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
