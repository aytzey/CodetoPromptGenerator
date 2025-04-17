// views/CodemapPreviewModal.tsx
/**
 * Re‑usable modal that renders the codemap result.
 * Large payloads are virtual‑scrolled via react‑window to stay performant.
 */
import React, { useMemo } from "react";
import {
  Code,
  ListTree,
  Bug,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import type { CodemapResponse } from "@/types";

interface Props {
  isOpen: boolean;
  onClose(): void;
  data: CodemapResponse;
}

export default function CodemapPreviewModal({ isOpen, onClose, data }: Props) {
  /* ───── flatten & memoise rows for react‑window ───── */
  type Row = { file: string; type: "header" | "class" | "func" | "error"; value?: string };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    Object.entries(data).forEach(([file, info]) => {
      out.push({ file, type: "header" });
      if (info.error) {
        out.push({ file, type: "error", value: info.error });
        return;
      }
      if (info.binary) {
        out.push({ file, type: "error", value: "Binary file skipped." });
        return;
      }
      info.classes.forEach((c) => out.push({ file, type: "class", value: c }));
      info.functions.forEach((f) => out.push({ file, type: "func", value: f }));
      if (info.classes.length === 0 && info.functions.length === 0) {
        out.push({ file, type: "error", value: "— no classes / functions —" });
      }
    });
    return out;
  }, [data]);

  /* ───── row renderer ───── */
  const RowRenderer = ({ index, style }: ListChildComponentProps) => {
    const r = rows[index];
    if (r.type === "header") {
      const info = data[r.file];
      return (
        <div
          style={style}
          className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 font-mono text-sm"
        >
          <ListTree size={14} className="text-indigo-500" />
          <span className="truncate">{r.file}</span>
          {!info.error && !info.binary && (
            <>
              <Badge variant="secondary" className="ml-auto">
                C: {info.classes.length}
              </Badge>
              <Badge variant="secondary">F: {info.functions.length}</Badge>
              <Badge variant="outline" className="text-gray-500">
                {info.references.length} refs
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

    const isErr = r.type === "error";
    return (
      <div
        style={style}
        className={`pl-8 pr-3 py-1.5 flex items-center gap-2 text-sm ${
          isErr ? "text-rose-600 dark:text-rose-400 italic" : ""
        }`}
      >
        {r.type === "class" && <Code size={12} className="text-cyan-500" />}
        {r.type === "func" && <ListIcon size={12} className="text-purple-500" />}
        {r.type === "error" && <AlertTriangle size={12} className="text-rose-500" />}
        <span className="truncate">{r.value}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="h-[70vh] w-full max-w-3xl p-0">
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <DialogTitle className="flex items-center gap-2">
            <ListTree size={18} className="text-indigo-500" />
            Codemap Preview
          </DialogTitle>
        </DialogHeader>

        {/* body */}
        <div className="flex-1">
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
