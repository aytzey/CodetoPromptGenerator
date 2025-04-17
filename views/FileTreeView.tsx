// views/FileTreeView.tsx
/**
 * Virtualised file‑tree · react‑window + auto‑sizer
 * ──────────────────────────────────────────────────
 * A directory checkbox now selects *only* its files (not the folder
 * itself) so downstream code never tries to “read” a folder as a file.
 *
 * exposes collapseAll()/expandAll() via ref
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
import type { FileNode } from "@/types";

/* ─────────── helpers ─────────── */
/**
 * Collect **file** descendants only.
 * A directory path itself is deliberately **excluded** so that the
 * selection list never contains folder entries.
 */
const collectDesc = (node: FileNode): string[] => {
  if (node.type === "file" || !node.children) return [node.relativePath];
  return node.children.flatMap(collectDesc);
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
    const paths = collectDesc(n);
    const next  = new Set(selectedSet);
    const everySelected = paths.every(p => next.has(p));
    paths.forEach(p => (everySelected ? next.delete(p) : next.add(p)));
    onSelectFiles(Array.from(next));
  };

  /* — render row — */
  const RowRenderer = ({ index, style }: ListChildComponentProps) => {
    const { node, depth } = rows[index];
    const isDir   = node.type === "directory";
    const desc    = collectDesc(node);
    const checked = desc.every(p => selectedSet.has(p));
    const partial = !checked && desc.some(p => selectedSet.has(p));

    return (
      <div
        style={{ ...style, paddingLeft: depth * 1.2 + "rem" }}
        className={`flex items-center pr-3 ${
          checked
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
          <span className="mr-5" />
        )}

        {/* checkbox */}
        <Checkbox
          id={`chk-${node.absolutePath}`}
          checked={checked}
          data-state={partial ? "indeterminate" : checked ? "checked" : "unchecked"}
          onCheckedChange={() => toggleSelection(node)}
          className="data-[state=checked]:bg-indigo-500 data-[state=indeterminate]:bg-indigo-300 dark:data-[state=indeterminate]:bg-indigo-700"
        />

        {/* icon + name */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`
                  ml-2 truncate text-sm flex items-center gap-1
                  ${
                    isDir
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-teal-600 dark:text-teal-400"
                  }
                `}
              >
                {isDir ? <Folder size={14} /> : <File size={14} />}
                {node.name}
              </span>
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

export default React.memo(FileTreeView);
