// views/FolderBrowserView.tsx
// FIX: Clear search input when browsing into a new folder.

import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft,
  Folder,
  HardDrive,
  Search,
  Loader2,
  FolderOpen,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

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

const API =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

type DrivesRaw = { drives?: FolderItem[] | string[] } | FolderItem[] | string[];

function normaliseDrives(raw: DrivesRaw): FolderItem[] {
  const src = Array.isArray(raw) ? raw : raw?.drives ?? [];
  return (src as (string | FolderItem)[]).map(it =>
    typeof it === 'string'
      ? { name: it, path: it }
      : { name: it.name ?? it.path, path: it.path ?? it.name }
  );
}

export default function FolderBrowserView({
  isOpen,
  onClose,
  onSelect,
  currentPath,
}: FolderBrowserProps) {
  /* ---------------- state ---------------- */
  const [drives, setDrives] = useState<FolderItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [path, setPath] = useState<string>(currentPath ?? '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(''); // State for search input

  /* -------------- effects --------------- */
  useEffect(() => {
    if (!isOpen) return;
    void loadDrives();
    if (currentPath) void browse(currentPath);
  }, [isOpen, currentPath, browse, loadDrives]);

  /* -------------- helpers --------------- */
  const fetchJson = useCallback(async (url: string) => {
    const r = await fetch(url);
    if (!r.ok) {
      const msg = `${r.status} ${r.statusText}`;
      throw new Error(msg);
    }
    return r.json();
  }, []);

  /* -------------- API calls -------------- */
  const loadDrives = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await fetchJson(`${API}/api/select_drives`);
      setDrives(normaliseDrives(raw));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load drives');
      setDrives([]);
    } finally {
      setLoading(false);
    }
  }, [fetchJson, setDrives, setError, setLoading]);

  const browse = useCallback(async (dir: string) => {
    try {
      setLoading(true);
      setSearch(''); // <<< FIX: Clear search term when browsing
      const j = await fetchJson(
        `${API}/api/browse_folders?path=${encodeURIComponent(dir)}`
      );
      setPath(j.current_path ?? '');
      setParentPath(j.parent_path ?? null);
      setFolders(j.folders ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to browse folder');
      setFolders([]);
      /* ensure `path` is still a defined string so
         render logic never crashes */
      setPath(prev => prev ?? '');
    } finally {
      setLoading(false);
    }
  }, [fetchJson, setSearch, setPath, setParentPath, setFolders, setError, setLoading]);

  /* -------------- derived --------------- */
  // Filter folders based on the search state
  const filtered = folders.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  /* --------------- render --------------- */
  return (
    <Dialog open={isOpen} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen size={18} className="text-indigo-500" />
            Select Folder
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mx-4 mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* ───── Drives column ───── */}
          <aside className="w-1/4 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <HardDrive size={16} className="text-indigo-500 mr-2" />
              <span className="text-sm font-medium">Drives</span>
            </div>

            <ScrollArea className="p-2 max-h-40">
              {loading && drives.length === 0 ? (
                <Loader2 className="animate-spin mx-auto mt-6" />
              ) : (
                drives.map(d => (
                  <Button
                    key={d.path}
                    size="sm"
                    variant={
                      (path ?? '').startsWith(d.path) ? 'secondary' : 'ghost'
                    }
                    className="w-full justify-start"
                    onClick={() => browse(d.path)}
                  >
                    <HardDrive size={14} className="mr-2" />
                    {d.name}
                  </Button>
                ))
              )}
            </ScrollArea>
          </aside>

          {/* ───── Folder list ───── */}
          <main className="flex-1 flex flex-col">
            {/* toolbar */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-amber-500" />
                <span className="text-sm font-medium">Folders</span>
                {parentPath && (
                  <Button size="sm" variant="ghost" onClick={() => browse(parentPath!)}>
                    <ChevronLeft size={14} /> Up
                  </Button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-7 h-8"
                  placeholder="Search…"
                  value={search} // Controlled input
                  onChange={e => setSearch(e.target.value)} // Update search state
                />
              </div>
            </div>

            {/* current path */}
            <div className="px-4 py-1 border-b border-gray-200 dark:border-gray-800 text-xs truncate">
              {path || <span className="italic text-gray-500">No folder selected</span>}
            </div>

            {/* list */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="animate-spin text-indigo-500 mb-3" />
                  <p>Loading…</p>
                </div>
              ) : filtered.length === 0 ? ( // Use filtered list here
                <div className="flex flex-col items-center py-12 text-gray-500">
                  <Folder size={32} className="mb-3 opacity-50" />
                  <p>{search ? 'No matching folders found' : 'No folders'}</p>
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
                    {/* Render the filtered list */}
                    {filtered.map(f => (
                      <TableRow
                        key={f.path}
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => browse(f.path)} // Clicking calls browse
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSelect(path)} disabled={!path}>
            Select This Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}