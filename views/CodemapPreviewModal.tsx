// views/CodemapPreviewModal.tsx
/**
 * Codemap Preview – virtualized & visually enhanced.
 * ────────────────────────────────────────────────────
 * A modal window that displays a structural map of classes 
 * and functions throughout the project's codebase.
 */

import React, { useMemo, useState } from "react";
import {
  Code,
  ListTree,
  AlertTriangle,
  FileCog,
  List as ListIcon,
  Search,
  X,
  Filter,
} from "lucide-react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import type { CodemapResponse } from "@/types";

/* ─────────────────────────────────────────────────── */

interface Props {
  isOpen: boolean;
  onClose(): void;
  data: CodemapResponse;
}

/* ─────────────────────────────────────────────────── */

export default function CodemapPreviewModal({
  isOpen,
  onClose,
  data,
}: Props) {
  // Local state for filtering and interaction
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  
  // Count totals for stats display
  const totalFiles = Object.keys(data).length;
  const totalClasses = Object.values(data).reduce((acc, info) => 
    acc + (info.classes?.length || 0), 0);
  const totalFunctions = Object.values(data).reduce((acc, info) => 
    acc + (info.functions?.length || 0), 0);

  /* — flatten codemap → rows for react‑window — */
  type Row =
    | { file: string; type: "header"; info: any }
    | { file: string; type: "class" | "func" | "note"; value: string };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    
    Object.entries(data).forEach(([file, info]) => {
      // Add file header
      out.push({ file, type: "header", info });

      if (info.error) {
        out.push({ file, type: "note", value: info.error });
        return;
      }
      
      if (info.binary) {
        out.push({ file, type: "note", value: "Binary file skipped." });
        return;
      }
      
      // Add classes
      info.classes.forEach((c) =>
        out.push({ file, type: "class", value: c }),
      );
      
      // Add functions
      info.functions.forEach((f) =>
        out.push({ file, type: "func", value: f }),
      );
      
      // Add empty notice if no classes or functions found
      if (
        info.classes.length === 0 &&
        info.functions.length === 0 &&
        !info.error
      ) {
        out.push({ file, type: "note", value: "— no classes / functions —" });
      }
    });
    
    // Filter rows based on search query if provided
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase();
      
      // Keep headers and matching items
      return out.filter(row => {
        if (row.type === "header") {
          // Always keep the header if any child matches
          const childrenMatch = out.some(r => 
            r.file === row.file && 
            r.type !== "header" && 
            r.value.toLowerCase().includes(normalizedQuery)
          );
          
          return row.file.toLowerCase().includes(normalizedQuery) || childrenMatch;
        } else {
          // Keep item if it or its parent file matches
          return row.value.toLowerCase().includes(normalizedQuery) || 
                 row.file.toLowerCase().includes(normalizedQuery);
        }
      });
    }
    
    return out;
  }, [data, searchQuery]);

  /* — single row renderer — */
  const RowRenderer = ({ index, style }: ListChildComponentProps) => {
    const r = rows[index];
    const isHovered = hoveredRowIndex === index;

    if (r.type === "header") {
      const info = r.info;
      // File header styling
      return (
        <div
          style={style}
          className={`px-4 py-2 border-b backdrop-blur-sm flex items-center gap-2 font-mono text-xs sm:text-sm transition-colors duration-150
            ${isHovered 
              ? "bg-[rgba(123,147,253,0.1)] border-[rgba(123,147,253,0.3)]" 
              : "bg-[rgba(22,23,46,0.8)] border-[rgba(60,63,87,0.7)]"
            }`}
          onMouseEnter={() => setHoveredRowIndex(index)}
          onMouseLeave={() => setHoveredRowIndex(null)}
        >
          <div className="flex items-center flex-grow min-w-0 gap-2">
            <ListTree size={16} className="text-[rgb(123,147,253)] flex-shrink-0" />
            <span className="truncate text-[rgb(224,226,240)] font-medium">{r.file}</span>
          </div>

          {!info.error && !info.binary && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className="bg-[rgba(139,233,253,0.1)] text-[rgb(139,233,253)] border border-[rgba(139,233,253,0.3)]">
                <Code size={12} className="mr-1" />
                {info.classes.length}
              </Badge>
              
              <Badge className="bg-[rgba(189,147,249,0.1)] text-[rgb(189,147,249)] border border-[rgba(189,147,249,0.3)]">
                <ListIcon size={12} className="mr-1" />
                {info.functions.length}
              </Badge>
              
              <Badge className="bg-[rgba(60,63,87,0.2)] text-[rgb(140,143,170)] border border-[rgba(60,63,87,0.5)]">
                {info.references.length} refs
              </Badge>
            </div>
          )}

          {info.binary && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1 rounded-full bg-[rgba(255,184,108,0.1)] border border-[rgba(255,184,108,0.3)]">
                    <FileCog size={14} className="text-[rgb(255,184,108)]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                  <p>Binary file skipped</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    }

    /* ─ Classes / functions / notes styling ─ */
    // Choose icon and styling based on type
    const getTypeStyles = () => {
      switch(r.type) {
        case "class":
          return {
            icon: <Code size={14} className="text-[rgb(139,233,253)]" />,
            bg: isHovered ? "bg-[rgba(139,233,253,0.08)]" : "bg-transparent",
            text: "text-[rgb(224,226,240)]",
            border: "border-l-[rgb(139,233,253)]"
          };
        case "func":
          return {
            icon: <ListIcon size={14} className="text-[rgb(189,147,249)]" />,
            bg: isHovered ? "bg-[rgba(189,147,249,0.08)]" : "bg-transparent",
            text: "text-[rgb(224,226,240)]",
            border: "border-l-[rgb(189,147,249)]"
          };
        case "note":
          return {
            icon: <AlertTriangle size={14} className="text-[rgb(255,85,85)]" />,
            bg: isHovered ? "bg-[rgba(255,85,85,0.08)]" : "bg-transparent",
            text: "italic text-[rgb(140,143,170)]",
            border: "border-l-[rgb(255,85,85)]"
          };
        default:
          return {
            icon: <Code size={14} />,
            bg: "",
            text: "",
            border: ""
          };
      }
    };

    const typeStyles = getTypeStyles();

    // Highlight matching text if search is active
    const highlightMatch = (text: string) => {
      if (!searchQuery.trim()) return <span className="truncate">{text}</span>;
      
      const normalizedQuery = searchQuery.toLowerCase();
      if (!text.toLowerCase().includes(normalizedQuery)) {
        return <span className="truncate">{text}</span>;
      }
      
      const parts = text.split(new RegExp(`(${searchQuery})`, 'i'));
      return (
        <span className="truncate">
          {parts.map((part, i) => 
            part.toLowerCase() === normalizedQuery 
              ? <span key={i} className="bg-[rgba(255,184,108,0.3)] text-white px-0.5 rounded">{part}</span>
              : part
          )}
        </span>
      );
    };

    return (
      <div
        style={style}
        className={`pl-10 pr-4 py-2 flex items-center gap-3 transition-colors duration-150 border-l-2 ${typeStyles.bg} ${typeStyles.text} ${typeStyles.border}`}
        onMouseEnter={() => setHoveredRowIndex(index)}
        onMouseLeave={() => setHoveredRowIndex(null)}
      >
        {typeStyles.icon}
        {highlightMatch(r.value)}
      </div>
    );
  };

  /* ————————————————— render ————————————————— */
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()} modal={true}>
      <DialogContent
        className="h-[80vh] w-full max-w-4xl p-0 flex flex-col overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.97)] backdrop-blur-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] animate-fade-in"
      >
        {/* Decorative background elements */}
        <div className="absolute -z-10 top-20 left-1/4 w-96 h-96 bg-[rgba(123,147,253,0.03)] rounded-full blur-[120px]"></div>
        <div className="absolute -z-10 bottom-0 right-1/3 w-80 h-80 bg-[rgba(189,147,249,0.03)] rounded-full blur-[100px]"></div>
        
        <DialogHeader className="px-5 py-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
          <DialogTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(139,233,253)]">
            <ListTree size={22} className="text-[rgb(123,147,253)]" />
            Codemap Preview
          </DialogTitle>
        </DialogHeader>

        {/* Search and stats bar */}
        <div className="px-5 py-3 border-b border-[rgba(60,63,87,0.5)] bg-[rgba(15,16,36,0.5)] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          {/* Search input */}
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(140,143,170)]" />
            <Input
              placeholder="Search classes & functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 bg-[rgba(15,16,36,0.6)] border-[rgba(60,63,87,0.7)] focus:ring-1 focus:ring-[rgb(123,147,253)] focus:border-transparent"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-[rgb(140,143,170)] hover:text-[rgb(224,226,240)]"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </Button>
            )}
          </div>
          
          {/* Stats badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-[rgba(15,16,36,0.4)] text-[rgb(224,226,240)] border border-[rgba(60,63,87,0.7)] px-2.5 py-1 h-auto">
              <ListTree size={14} className="mr-1.5 text-[rgb(123,147,253)]" />
              {totalFiles} Files
            </Badge>
            
            <Badge className="bg-[rgba(15,16,36,0.4)] text-[rgb(224,226,240)] border border-[rgba(60,63,87,0.7)] px-2.5 py-1 h-auto">
              <Code size={14} className="mr-1.5 text-[rgb(139,233,253)]" />
              {totalClasses} Classes
            </Badge>
            
            <Badge className="bg-[rgba(15,16,36,0.4)] text-[rgb(224,226,240)] border border-[rgba(60,63,87,0.7)] px-2.5 py-1 h-auto">
              <ListIcon size={14} className="mr-1.5 text-[rgb(189,147,249)]" />
              {totalFunctions} Functions
            </Badge>
            
            {searchQuery && (
              <Badge className="bg-[rgba(255,184,108,0.15)] text-[rgb(255,184,108)] border border-[rgba(255,184,108,0.3)] px-2.5 py-1 h-auto animate-pulse">
                <Filter size={14} className="mr-1.5" />
                {rows.filter(r => r.type !== "header").length} Results
              </Badge>
            )}
          </div>
        </div>

        {/* Virtual list */}
        <div className="flex-1 min-h-0 relative">
          {/* Empty state */}
          {rows.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[rgb(140,143,170)]">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[rgba(60,63,87,0.2)] mb-4">
                <Search size={24} className="opacity-60" />
              </div>
              <p className="text-lg">No results found</p>
              <p className="text-sm mt-1">Try adjusting your search query</p>
            </div>
          )}
          
          {/* List container */}
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={rows.length}
                itemSize={36}
                overscanCount={10}
                className="scrollbar-thin"
              >
                {RowRenderer}
              </List>
            )}
          </AutoSizer>
          
          {/* Gradient fade effect at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[rgba(15,16,36,0.5)] to-transparent pointer-events-none"></div>
        </div>
        
        {/* Footer with legend */}
        <DialogFooter className="px-5 py-3 border-t border-[rgba(60,63,87,0.5)] bg-[rgba(15,16,36,0.5)]">
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[rgb(140,143,170)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[rgb(139,233,253)] rounded-full mr-1.5"></div>
                Classes
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[rgb(189,147,249)] rounded-full mr-1.5"></div>
                Functions
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[rgb(255,85,85)] rounded-full mr-1.5"></div>
                Notes
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[rgba(123,147,253,0.4)] text-[rgb(123,147,253)] hover:bg-[rgba(123,147,253,0.1)] hover:text-[rgb(123,147,253)] hover:border-[rgba(123,147,253,0.6)] h-8 px-3 text-xs"
            >
              Close Preview
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}