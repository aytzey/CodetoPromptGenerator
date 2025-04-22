// views/FileTreeView.tsx
/**
 * Virtualised file‑tree · react‑window + auto‑sizer
 * ──────────────────────────────────────────────────
 *   • supports tri‑state checkboxes
 *   • NEW: selecting a directory in a *filtered* view still toggles **all**
 *     of its file descendants, even those currently hidden.
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  FolderOpen,
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

/**
 * Recursively collect relative paths of *files* only within a node's subtree.
 */
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
  /** Tree already filtered for UI rendering */
  tree: FileNode[];
  /** The complete, unfiltered project tree (needed for selection logic) */
  fullTree: FileNode[];
  /** Currently‑selected file relative paths */
  selectedFiles: string[];
  /** Callback when the set of selected files changes */
  onSelectFiles(paths: string[]): void;
}

interface Row {
  node: FileNode;
  depth: number;
}

const ROW_HEIGHT = 30;

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
      (nodes: FileNode[], depth = 0): Row[] =>
        nodes.flatMap((n) => {
          const rows: Row[] = [{ node: n, depth }];
          if (
            n.type === "directory" &&
            n.children &&
            !collapsed.has(n.absolutePath)
          ) {
            rows.push(...flatten(n.children, depth + 1));
          }
          return rows;
        }),
      [collapsed],
    );

    /* — derived — */
    const rows = useMemo(() => flatten(tree), [flatten, tree]);
    const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);

    const toggleSelection = (n: FileNode) => {
      /** Use the *original* node so we grab hidden descendants, too */
      const origin =
        findNodeByPath(fullTree, n.relativePath) /* may be undefined */ ?? n;

      const pathsToToggle = collectFileDescendants(origin);
      if (!pathsToToggle.length) return;

      const next = new Set(selectedSet);
      const currentlyAllSelected = pathsToToggle.every((p) => next.has(p));

      pathsToToggle.forEach((p) =>
        currentlyAllSelected ? next.delete(p) : next.add(p),
      );
      onSelectFiles(Array.from(next));
    };

    /* — render row — */
    const RowRenderer = ({ index, style }: ListChildComponentProps) => {
      const { node, depth } = rows[index];
      const isDir = node.type === "directory";
      const isOpen = isDir && !collapsed.has(node.absolutePath);
      const rowId = node.absolutePath;

      /** For checkbox state we again need the *original* node */
      const selectableFiles = useMemo(() => {
        const origin =
          findNodeByPath(fullTree, node.relativePath) ?? node;
        return collectFileDescendants(origin);
      }, [node, fullTree]);
      const isEmpty = selectableFiles.length === 0;
      const checked =
        !isEmpty && selectableFiles.every((p) => selectedSet.has(p));
      const partial =
        !isEmpty && !checked && selectableFiles.some((p) => selectedSet.has(p));

      /* Extension‑based colour */
      const fileExt =
        node.type === "file" ? node.name.split(".").pop()?.toLowerCase() ?? "" : "";

      const getFileColour = (ext: string) => {
        if (["js", "jsx", "ts", "tsx"].includes(ext)) return "text-[rgb(241,250,140)]";
        if (["py"].includes(ext)) return "text-[rgb(80,250,123)]";
        if (["json", "xml", "yml", "yaml"].includes(ext))
          return "text-[rgb(255,184,108)]";
        if (["md", "txt", "pdf"].includes(ext)) return "text-[rgb(224,226,240)]";
        if (["css", "scss", "less", "sass"].includes(ext))
          return "text-[rgb(139,233,253)]";
        if (["html", "htm"].includes(ext)) return "text-[rgb(255,121,198)]";
        return "text-[rgb(190,192,210)]";
      };

      return (
        <div
          style={{ ...style, paddingLeft: depth * 1.2 + "rem" }}
          className={cn(
            "flex items-center pr-3 transition-colors duration-150 relative",
            checked && !isEmpty
              ? "bg-[rgba(123,147,253,0.15)]"
              : hoveredRow === rowId
              ? "bg-[rgba(60,63,87,0.3)]"
              : "",
          )}
          onMouseEnter={() => setHoveredRow(rowId)}
          onMouseLeave={() => setHoveredRow(null)}
        >
          {checked && !isEmpty && (
            <div className="absolute left-0 top-0 h-full w-0.5 bg-[rgb(123,147,253)]" />
          )}

          {/* Collapse/expand chevron */}
          {isDir ? (
            <button
              className="mr-1 p-0.5 text-[rgb(140,143,170)] hover:text-[rgb(123,147,253)] rounded-sm transition-colors"
              onClick={() => toggleCollapse(node.absolutePath)}
            >
              {collapsed.has(node.absolutePath) ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          ) : (
            <span className="mr-5" />
          )}

          {/* Checkbox */}
          <Checkbox
            id={`chk-${node.absolutePath}`}
            checked={checked}
            data-state={partial ? "indeterminate" : checked ? "checked" : "unchecked"}
            onCheckedChange={() => toggleSelection(node)}
            disabled={isEmpty}
            className={cn(
              "rounded-sm transition-colors",
              "data-[state=checked]:bg-[rgb(123,147,253)] data-[state=checked]:border-[rgb(123,147,253)]",
              "data-[state=indeterminate]:bg-[rgba(123,147,253,0.5)] data-[state=indeterminate]:border-[rgba(123,147,253,0.5)]",
              isEmpty &&
                "opacity-40 cursor-not-allowed border-[rgba(60,63,87,0.7)]",
            )}
          />

          {/* Icon + name */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <label
                  htmlFor={`chk-${node.absolutePath}`}
                  className={cn(
                    "ml-2 truncate text-sm flex items-center gap-1.5 cursor-pointer font-medium transition-colors",
                    isDir
                      ? "text-[rgb(255,184,108)]"
                      : getFileColour(fileExt),
                    isEmpty && "opacity-50",
                  )}
                >
                  {isDir ? (
                    isOpen ? (
                      <FolderOpen size={16} className="shrink-0" />
                    ) : (
                      <Folder size={16} className="shrink-0" />
                    )
                  ) : (
                    <File size={16} className="shrink-0" />
                  )}
                  <span className="truncate">{node.name}</span>
                </label>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-mono text-xs break-all">
                {node.relativePath}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Dir child‑count badge */}
          {isDir && node.children?.length ? (
            <Badge
              variant="outline"
              className="ml-2 text-xs py-0 px-1.5 h-5 font-normal bg-[rgba(255,184,108,0.1)] text-[rgb(255,184,108)] border-[rgba(255,184,108,0.3)] rounded-md"
            >
              {node.children.length}
            </Badge>
          ) : null}
        </div>
      );
    };

    /* — empty state — */
    if (!rows.length)
      return (
        <div className="flex flex-col items-center justify-center h-full py-12 text-[rgb(140,143,170)]">
          <Folder size={48} className="mb-4 opacity-50" />
          <p className="text-lg">No files to display</p>
          {tree.length > 0 && (
            <p className="text-sm mt-1 text-[rgb(255,121,198)]">
              Try adjusting your filters
            </p>
          )}
        </div>
      );

    /* — main render — */
    return (
      <div className="h-[350px] custom-scrollbar">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={rows.length}
              itemSize={ROW_HEIGHT}
              overscanCount={8}
              className="scrollbar-thin"
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
