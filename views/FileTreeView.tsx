// views/FileTreeView.tsx
/**
 * Virtualised file‑tree · react‑window + auto‑sizer
 * ──────────────────────────────────────────────────
 * A directory checkbox now selects *only* its files (not the folder
 * itself) so downstream code never tries to “read” a folder as a file.
 *
 * exposes collapseAll()/expandAll() via ref
 *
 * FIX (Bug Report Fix): Checkbox state and interaction for empty/filtered folders.
 *   - Introduced `collectSelectableFileDescendants` to get only file paths.
 *   - Checkbox state (`checked`, `partial`) now based solely on selectable files.
 *   - Checkbox is disabled (`isDisabled`) if a folder contains no selectable files.
 *   - `toggleSelection` now uses `collectSelectableFileDescendants`.
 */

import React, {
  useMemo, useState, useCallback, useImperativeHandle, forwardRef,
} from "react";
import {
  ChevronRight, ChevronDown, Folder, File,
} from "lucide-react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // Ensure cn is imported
import type { FileNode } from "@/types";

/* ─────────── helpers ─────────── */

/**
 * Recursively collect relative paths of *files* only within a node's subtree.
 * Directories themselves are excluded from the result.
 */
const collectSelectableFileDescendants = (node: FileNode): string[] => {
  if (node.type === 'file') return [node.relativePath];
  if (!node.children) return []; // Empty directory or file without children array
  // Recursively collect files from children
  return node.children.flatMap(collectSelectableFileDescendants);
};

/* ─────────── public interface ─────────── */
export interface FileTreeViewHandle {
  collapseAll(): void;
  expandAll(): void;
}

interface Props {
  tree: FileNode[];
  selectedFiles: string[];
  onSelectFiles(paths: string[]): void;
}

interface Row {
  node: FileNode;
  depth: number;
}

const ROW_HEIGHT = 28;

const FileTreeView = forwardRef<FileTreeViewHandle, Props>(
({ tree, selectedFiles, onSelectFiles }, ref) => {
  /* — state — */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  /* — imperative API — */
  useImperativeHandle(
    ref,
    () => ({
      collapseAll() {
        const dirs = new Set<string>();
        const walk = (n: FileNode[]) =>
          n.forEach(node => {
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
      setCollapsed(s => {
        const next = new Set(s);
        next.has(absPath) ? next.delete(absPath) : next.add(absPath);
        return next;
      }),
    [],
  );

  const flatten = useCallback(
    (nodes: FileNode[], depth = 0): Row[] =>
      nodes.flatMap(n => {
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
    const pathsToToggle = collectSelectableFileDescendants(n); // Use the file-only helper
    if (pathsToToggle.length === 0) return; // Do nothing if no files to toggle

    const next = new Set(selectedSet);
    // Determine if *all* selectable files under this node are currently selected
    const allCurrentlySelected = pathsToToggle.every(p => next.has(p));

    // If all are selected, deselect them. Otherwise, select them.
    pathsToToggle.forEach(p => (allCurrentlySelected ? next.delete(p) : next.add(p)));
    onSelectFiles(Array.from(next));
  };

  /* — render row — */
  const RowRenderer = ({ index, style }: ListChildComponentProps) => {
    const { node, depth } = rows[index];
    const isDir = node.type === "directory";

    // Calculate checkbox state based *only* on selectable files
    const selectableFiles = useMemo(() => collectSelectableFileDescendants(node), [node]);
    const isEmpty = selectableFiles.length === 0;
    const checked = !isEmpty && selectableFiles.every(p => selectedSet.has(p));
    const partial = !isEmpty && !checked && selectableFiles.some(p => selectedSet.has(p));
    const isDisabled = isEmpty; // Disable checkbox if no selectable files underneath

    return (
      <div
        style={{ ...style, paddingLeft: depth * 1.2 + "rem" }}
        className={`flex items-center pr-3 ${
          checked && !isDisabled // Only apply background if checked and not disabled (i.e., not an empty folder)
            ? "bg-indigo-50 dark:bg-indigo-950/30"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
      >
        {/* collapse handle */}
        {isDir ? (
          <button
            className="mr-1 p-0.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-sm"
            onClick={() => toggleCollapse(node.absolutePath)}
          >
            {collapsed.has(node.absolutePath) ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        ) : (
          <span className="mr-5" /> // Placeholder for alignment
        )}

        {/* checkbox */}
        <Checkbox
          id={`chk-${node.absolutePath}`}
          checked={checked} // 'checked' is now correctly calculated based on selectable files
          // Use data-state for indeterminate visual style, Radix handles this well
          data-state={partial ? "indeterminate" : checked ? "checked" : "unchecked"}
          onCheckedChange={() => toggleSelection(node)}
          disabled={isDisabled} // Add the disabled state
          className={cn(
            "data-[state=checked]:bg-indigo-500 data-[state=indeterminate]:bg-indigo-300 dark:data-[state=indeterminate]:bg-indigo-700",
            isDisabled && "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600" // Add styling for disabled state
          )}
        />

        {/* icon + name */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label // Use label for better accessibility with checkbox
                htmlFor={`chk-${node.absolutePath}`}
                className={cn(
                  `ml-2 truncate text-sm flex items-center gap-1 cursor-pointer`,
                  isDir
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-teal-600 dark:text-teal-400",
                  isDisabled && "text-gray-400 dark:text-gray-500" // Dim text if disabled
                )}
              >
                {isDir ? <Folder size={14} /> : <File size={14} />}
                {node.name}
              </label>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="font-mono text-xs max-w-sm break-all"
            >
              {node.relativePath}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* badge for dir children count */}
        {isDir && node.children && node.children.length > 0 && (
          <Badge
            variant="outline"
            className="ml-2 text-xs py-0 px-1.5 h-4 font-normal text-gray-500 dark:text-gray-400 bg-transparent"
          >
            {node.children.length}
          </Badge>
        )}
      </div>
    );
  };

  /* — shell — */
  return rows.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400">
      <Folder size={40} className="mb-2 opacity-50" />
      <p>No files to display</p>
      {tree.length > 0 && <p className="text-xs mt-1">(Check filters?)</p>}
    </div>
  ) : (
    <div className="h-[350px]">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={rows.length}
            itemSize={ROW_HEIGHT}
            overscanCount={8}
          >
            {RowRenderer}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

FileTreeView.displayName = 'FileTreeView'; // Add display name for forwardRef

export default React.memo(FileTreeView);