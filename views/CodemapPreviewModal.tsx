// views/CodemapPreviewModal.tsx
/**
 * Codemap Preview – virtual‑scrolled & light‑weight.
 * ————————————————————————————————————————————————————
 * FIXES
 *   • DialogContent is now <div className="flex flex-col"> ➜ gives AutoSizer height > 0
 *   • Better colour coding & small‑screen handling
 */

import React, { useMemo } from "react";
import {
  Code,
  ListTree,
  AlertTriangle,
  FileCog,
  List as ListIcon,
} from "lucide-react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  /* — flatten codemap → rows for react‑window — */
  type Row =
    | { file: string; type: "header" }
    | { file: string; type: "class" | "func" | "note"; value: string };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    Object.entries(data).forEach(([file, info]) => {
      out.push({ file, type: "header" });

      if (info.error) {
        out.push({ file, type: "note", value: info.error });
        return;
      }
      if (info.binary) {
        out.push({ file, type: "note", value: "Binary file skipped." });
        return;
      }
      info.classes.forEach((c) =>
        out.push({ file, type: "class", value: c }),
      );
      info.functions.forEach((f) =>
        out.push({ file, type: "func", value: f }),
      );
      if (
        info.classes.length === 0 &&
        info.functions.length === 0 &&
        !info.error
      ) {
        out.push({ file, type: "note", value: "— no classes / functions —" });
      }
    });
    return out;
  }, [data]);

  /* — single row renderer — */
  const RowRenderer = ({ index, style }: ListChildComponentProps) => {
    const r = rows[index];

    if (r.type === "header") {
      const info = data[r.file];
      return (
        <div
          style={style}
          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 font-mono text-xs sm:text-sm"
        >
          <ListTree size={14} className="text-indigo-500 flex-shrink-0" />
          <span className="truncate">{r.file}</span>

          {!info.error && !info.binary && (
            <>
              <Badge variant="secondary" className="ml-auto">C:{info.classes.length}</Badge>
              <Badge variant="secondary">F:{info.functions.length}</Badge>
              <Badge variant="outline" className="text-gray-500">
                {info.references.length} refs
              </Badge>
            </>
          )}

          {info.binary && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FileCog size={14} className="ml-auto text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>Binary file skipped</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    }

    /* ─ classes / functions / notes ─ */
    const icon =
      r.type === "class" ? (
        <Code size={12} className="text-cyan-500" />
      ) : r.type === "func" ? (
        <ListIcon size={12} className="text-purple-500" />
      ) : (
        <AlertTriangle size={12} className="text-rose-500" />
      );

    const txtClass =
      r.type === "note"
        ? "italic text-rose-600 dark:text-rose-400"
        : "text-gray-700 dark:text-gray-200";

    return (
      <div
        style={style}
        className={`pl-8 pr-3 py-1.5 flex items-center gap-2 truncate text-xs sm:text-sm ${txtClass}`}
      >
        {icon}
        <span className="truncate">{r.value}</span>
      </div>
    );
  };

  /* ————————————————— render ————————————————— */
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="h-[70vh] w-full max-w-3xl p-0 flex flex-col" /* <-- FLEX FIX */
      >
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <DialogTitle className="flex items-center gap-2">
            <ListTree size={18} className="text-indigo-500" />
            Codemap Preview
          </DialogTitle>
        </DialogHeader>

        {/* virtual list */}
        <div className="flex-1 min-h-0">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={rows.length}
                itemSize={28}
                overscanCount={8}
              >
                {RowRenderer}
              </List>
            )}
          </AutoSizer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
