// views/FileTreeView.tsx
/**
 * Virtualised file‑tree · react‑window + auto‑sizer
 * ──────────────────────────────────────────────────
 * Enhanced with modern styling for Behance portfolio
 */

import React, {
  useMemo, useState, useCallback, useImperativeHandle, forwardRef,
} from "react";
import {
  ChevronRight, ChevronDown, Folder, File, FolderOpen,
} from "lucide-react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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

const ROW_HEIGHT = 30;

const FileTreeView = forwardRef<FileTreeViewHandle, Props>(
({ tree, selectedFiles, onSelectFiles }, ref) => {
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
    const isOpen = isDir && !collapsed.has(node.absolutePath);
    const rowId = node.absolutePath;

    // Calculate checkbox state based *only* on selectable files
    const selectableFiles = useMemo(() => collectSelectableFileDescendants(node), [node]);
    const isEmpty = selectableFiles.length === 0;
    const checked = !isEmpty && selectableFiles.every(p => selectedSet.has(p));
    const partial = !isEmpty && !checked && selectableFiles.some(p => selectedSet.has(p));
    const isDisabled = isEmpty; // Disable checkbox if no selectable files underneath
    
    // File extension for coloring
    const fileExt = node.type === 'file' ? (node.name.split('.').pop() || '').toLowerCase() : '';
    
    // Extension-based color mapping
    const getFileColor = (ext: string) => {
      if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'text-[rgb(241,250,140)]'; // JavaScript/TypeScript - yellow
      if (['py'].includes(ext)) return 'text-[rgb(80,250,123)]'; // Python - green
      if (['json', 'xml', 'yml', 'yaml'].includes(ext)) return 'text-[rgb(255,184,108)]'; // Data files - orange
      if (['md', 'txt', 'pdf'].includes(ext)) return 'text-[rgb(224,226,240)]'; // Text files - white
      if (['css', 'scss', 'less', 'sass'].includes(ext)) return 'text-[rgb(139,233,253)]'; // Style files - cyan
      if (['html', 'htm'].includes(ext)) return 'text-[rgb(255,121,198)]'; // HTML - pink
      return 'text-[rgb(190,192,210)]'; // Default - gray
    };

    return (
      <div
        style={{ ...style, paddingLeft: depth * 1.2 + "rem" }}
        className={cn(
          "flex items-center pr-3 transition-colors duration-150 relative",
          checked && !isDisabled 
            ? "bg-[rgba(123,147,253,0.15)]" 
            : hoveredRow === rowId 
              ? "bg-[rgba(60,63,87,0.3)]" 
              : ""
        )}
        onMouseEnter={() => setHoveredRow(rowId)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        {/* Left border highlight for selected items */}
        {checked && !isDisabled && (
          <div className="absolute left-0 top-0 h-full w-0.5 bg-[rgb(123,147,253)]"></div>
        )}
        
        {/* Collapse handle with animations */}
        {isDir ? (
          <button
            className="mr-1 p-0.5 text-[rgb(140,143,170)] hover:text-[rgb(123,147,253)] rounded-sm transition-colors"
            onClick={() => toggleCollapse(node.absolutePath)}
          >
            {collapsed.has(node.absolutePath) ? (
              <ChevronRight size={16} className="transform transition-transform duration-150" />
            ) : (
              <ChevronDown size={16} className="transform transition-transform duration-150" />
            )}
          </button>
        ) : (
          <span className="mr-5" /> // Placeholder for alignment
        )}

        {/* Enhanced checkbox */}
        <Checkbox
          id={`chk-${node.absolutePath}`}
          checked={checked}
          data-state={partial ? "indeterminate" : checked ? "checked" : "unchecked"}
          onCheckedChange={() => toggleSelection(node)}
          disabled={isDisabled}
          className={cn(
            "data-[state=checked]:bg-[rgb(123,147,253)] data-[state=checked]:border-[rgb(123,147,253)] data-[state=indeterminate]:bg-[rgba(123,147,253,0.5)] data-[state=indeterminate]:border-[rgba(123,147,253,0.5)] transition-colors",
            isDisabled && "opacity-40 cursor-not-allowed border-[rgba(60,63,87,0.7)]",
            "rounded-sm" // Squared checkbox style
          )}
        />

        {/* Icon + name with enhanced styling */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <label 
                htmlFor={`chk-${node.absolutePath}`}
                className={cn(
                  `ml-2 truncate text-sm flex items-center gap-1.5 cursor-pointer font-medium transition-colors`,
                  isDir
                    ? isOpen 
                      ? "text-[rgb(255,184,108)]" // Open folder
                      : "text-[rgb(255,184,108)]" // Closed folder
                    : getFileColor(fileExt), // File with extension-based color
                  isDisabled && "opacity-50", // Dim if disabled
                  "py-1.5" // Add padding for better touch target
                )}
              >
                {isDir ? 
                  isOpen ? <FolderOpen size={16} className="shrink-0" /> : <Folder size={16} className="shrink-0" />
                  : <File size={16} className="shrink-0" />
                }
                <span className="truncate">{node.name}</span>
              </label>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="font-mono text-xs max-w-sm break-all bg-[rgba(15,16,36,0.9)] border border-[rgba(60,63,87,0.7)] backdrop-blur-md shadow-md"
            >
              {node.relativePath}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Enhanced badge for dir children count */}
        {isDir && node.children && node.children.length > 0 && (
          <Badge
            variant="outline"
            className="ml-2 text-xs py-0 px-1.5 h-5 font-normal bg-[rgba(255,184,108,0.1)] text-[rgb(255,184,108)] border-[rgba(255,184,108,0.3)] rounded-md"
          >
            {node.children.length}
          </Badge>
        )}
      </div>
    );
  };

  /* — empty state — */
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-[rgb(140,143,170)]">
        <Folder size={48} className="mb-4 opacity-50" />
        <p className="text-lg">No files to display</p>
        {tree.length > 0 && <p className="text-sm mt-1 text-[rgb(255,121,198)]">Try adjusting your filters</p>}
      </div>
    );
  }

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
});

FileTreeView.displayName = 'FileTreeView'; // Add display name for forwardRef

export default React.memo(FileTreeView);