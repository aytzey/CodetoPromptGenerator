// views/FolderBrowserView.tsx — SECOND PATCH
// --------------------------------------------------
// Handles API responses that may return either
//   1) { success: true, drives: [...] }
//   2) [ ... ]  (plain array)
// so that `drives` is **always** an array to avoid
// `TypeError: drives.map is not a function` in React.

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  Folder,
  HardDrive,
  Search,
  Loader2,
  FolderOpen,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface FolderItem {
  name: string;
  path: string;
}

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

type DriveResponse = { drives?: FolderItem[] } | FolderItem[];

// unwrap() keeps the earlier behaviour but is not responsible for array vs object anymore.
function unwrap<T = any>(raw: any): T | null {
  if (raw == null) return null;
  if (raw.success !== undefined && raw.data !== undefined) return raw.data as T;
  return raw as T;
}

const FolderBrowserView: React.FC<FolderBrowserProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentPath,
}) => {
  const [drives, setDrives] = useState<FolderItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [path, setPath] = useState<string>(currentPath || "");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isOpen) return;
    void loadDrives();
    if (currentPath) void browseFolder(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentPath]);

  /* ------------------------------------------------------------------ */
  const loadDrives = async () => {
    try {
      setIsLoading(true);
      const resp = await fetch(`${BACKEND_URL}/api/select_drives`);
      const raw: DriveResponse | null = unwrap(await resp.json());
      if (raw === null) throw new Error("Empty response from server");

      // Normalise different possible shapes
      const list: FolderItem[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.drives)
        ? raw.drives
        : [];

      setDrives(list);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load drives");
      setDrives([]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  const browseFolder = async (folderPath: string) => {
    try {
      setIsLoading(true);
      const resp = await fetch(
        `${BACKEND_URL}/api/browse_folders?path=${encodeURIComponent(
          folderPath
        )}`
      );
      const json = unwrap<{
        current_path: string;
        parent_path: string | null;
        folders: FolderItem[];
      }>(await resp.json());
      if (!json) throw new Error("Bad response format");

      setPath(json.current_path);
      setParentPath(json.parent_path);
      setFolders(json.folders ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to browse folder");
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  const goUp = () => parentPath && browseFolder(parentPath);
  const filtered = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ------------------------------------------------------------------ */
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen size={18} className="text-indigo-500" /> Select Folder
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mx-4 mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-1/4 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <HardDrive size={16} className="text-indigo-500 mr-2" />
              <span className="text-sm font-medium">Drives</span>
            </div>
            <ScrollArea className="p-2 max-h-40">
              {isLoading && drives.length === 0 ? (
                <Loader2 className="animate-spin mx-auto mt-6" />
              ) : (
                drives.map((d) => (
                  <Button
                    key={d.path}
                    size="sm"
                    variant={path.startsWith(d.path) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => browseFolder(d.path)}
                  >
                    <HardDrive size={14} className="mr-2" />
                    {d.name}
                  </Button>
                ))
              )}
            </ScrollArea>
          </aside>

          {/* Folder list */}
          <main className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-amber-500" />
                <span className="text-sm font-medium">Folders</span>
                {parentPath && (
                  <Button size="sm" variant="ghost" onClick={goUp}>
                    <ChevronLeft size={14} /> Up
                  </Button>
                )}
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-7 h-8"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Current path */}
            <div className="px-4 py-1 border-b border-gray-200 dark:border-gray-800 text-xs truncate">
              {path || <span className="italic text-gray-500">No folder selected</span>}
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="animate-spin text-indigo-500 mb-3" />
                  <p>Loading…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-gray-500">
                  <Folder size={32} className="mb-3 opacity-50" />
                  <p>No folders</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-900">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((f) => (
                      <TableRow
                        key={f.path}
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => browseFolder(f.path)}
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          <Folder size={14} className="text-amber-500" /> {f.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{f.path}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </main>
        </div>

        <DialogFooter className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSelect(path)} disabled={!path}>Select This Folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderBrowserView;
