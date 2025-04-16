// views/FolderBrowserView.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  Folder,
  HardDrive,
  X,
  ChevronRight,
  Search,
  Home,
  Clock,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface FolderItem {
  name: string;
  path: string;
}

interface FolderBrowserProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the user closes the modal (e.g., clicking the overlay or pressing Cancel) */
  onClose: () => void;
  /** Called when the user selects a folder */
  onSelect: (path: string) => void;
  /** The path initially displayed; if none, the user starts at e.g. drives. */
  currentPath: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

/**
 * A modal "folder browser" that tries to list drives and subfolders from a (mock) Python API.
 * This code is for demonstration and not a secure production solution.
 */
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
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [recentFolders, setRecentFolders] = useState<FolderItem[]>([]);

  // On open, load drives + the current folder contents (if any)
  useEffect(() => {
    if (isOpen) {
      loadDrives();
      loadRecentFolders();
      if (currentPath) {
        browseFolder(currentPath);
      }
    }
  }, [isOpen, currentPath]);

  const loadRecentFolders = () => {
    /* Browser only – guard for SSR */
    // eslint‑disable-next-line @typescript-eslint/strict‑boolean‑expressions
    const isWindows =
      typeof navigator !== 'undefined' &&
      navigator.platform.toLowerCase().startsWith('win');

    if (isWindows) {
      /* Classic Windows suggestions */
      setRecentFolders([
        { name: 'Documents', path: 'C:\\Users\\User\\Documents' },
        { name: 'Downloads', path: 'C:\\Users\\User\\Downloads' },
        { name: 'Projects',  path: 'C:\\Users\\User\\Projects'  },
      ]);
    } else {
      /* Leave empty on Linux / macOS for now – avoids bad paths */
      setRecentFolders([]);
      /* ✱ Optional: push sensible *NIX* defaults here, e.g.
         const home = '/home'; setRecentFolders([{ name: 'root', path: '/' }])
         Feel free to extend later. */
    }
  };

  /** Fetch available drives from the Python backend. */
  const loadDrives = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const resp = await fetch(`${BACKEND_URL}/api/select_drives`);
      const data = await resp.json();
      if (data.success) {
        setDrives(data.drives || []);
      } else {
        setError(data.error || "Failed to load drives");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setIsLoading(false);
    }
  };

  /** Browse a folder (subfolders) from the Python backend. */
  const browseFolder = async (folderPath: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const resp = await fetch(
        `${BACKEND_URL}/api/browse_folders?path=${encodeURIComponent(
          folderPath
        )}`
      );
      const data = await resp.json();

      if (data.success) {
        setPath(data.current_path);
        setParentPath(data.parent_path);
        setFolders(data.folders || []);
        setSearchQuery(""); // Clear any search on navigation

        // Mark the drive as selected if path matches
        const matchedDrive = drives.find((drive) =>
          data.current_path.startsWith(drive.path)
        );
        setSelectedDrive(matchedDrive ? matchedDrive.path : null);
      } else {
        setError(data.error || "Failed to browse folder");
      }
    } catch (err) {
      setError("Failed to browse folder");
    } finally {
      setIsLoading(false);
    }
  };

  /** Navigate up one directory level. */
  const goToParent = () => {
    if (parentPath) {
      browseFolder(parentPath);
    }
  };

  /** When a user clicks a drive in the sidebar. */
  const handleSelectDrive = (drivePath: string) => {
    setSelectedDrive(drivePath);
    browseFolder(drivePath);
  };

  /** Confirm selection. */
  const handleSelectFolder = () => {
    if (path) {
      const newRecentFolder = { name: path.split(/[/\\]/).pop() || path, path };
      if (!recentFolders.some((f) => f.path === path)) {
        setRecentFolders([newRecentFolder, ...recentFolders.slice(0, 4)]);
      }
    }
    onSelect(path);
  };

  /** Filter subfolders by search query. */
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  /** Display a basic breadcrumb navigation. */
  const renderBreadcrumbs = () => {
    if (!path)
      return (
        <span className="text-gray-500 dark:text-gray-400 italic">
          No folder selected
        </span>
      );
    const parts = path.split(/[/\\]/).filter(Boolean);
    const isWindows = path.includes("\\");
    const separator = isWindows ? "\\" : "/";

    // Root part
    const rootPart = isWindows ? path.substring(0, 3) : "/";

    return (
      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1">
        <Button
          onClick={() => browseFolder(rootPart)}
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          title={rootPart}
        >
          <Home size={14} className="mr-1" />
          {rootPart}
        </Button>

        {parts.slice(isWindows ? 1 : 0).map((part, idx) => {
          const currentPath = isWindows
            ? rootPart + parts.slice(1, idx + 1).join(separator)
            : separator + parts.slice(0, idx + 1).join(separator);

          return (
            <React.Fragment key={idx}>
              <ChevronRight size={14} className="text-gray-400" />
              <Button
                onClick={() => browseFolder(currentPath)}
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 truncate max-w-xs text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                title={part}
              >
                {part}
              </Button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <DialogTitle className="text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <FolderOpen
              size={18}
              className="text-indigo-500 dark:text-indigo-400"
            />
            Select Folder
          </DialogTitle>
        </DialogHeader>

        {/* Error message */}
        {error && (
          <Alert
            variant="destructive"
            className="mx-4 mt-4 bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main content: left sidebar (drives/recent) and right subfolder list */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-1/4 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
            {/* Drives */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center">
              <HardDrive
                size={16}
                className="text-indigo-500 dark:text-indigo-400 mr-2"
              />
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Drives
              </h4>
            </div>
            <ScrollArea className="p-2 text-sm max-h-40 bg-white dark:bg-gray-900">
              {isLoading && drives.length === 0 ? (
                <div className="flex items-center justify-center p-4 space-x-2">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {drives.map((drive) => (
                    <Button
                      key={drive.path}
                      onClick={() => handleSelectDrive(drive.path)}
                      variant={
                        selectedDrive === drive.path ? "secondary" : "ghost"
                      }
                      className={`
                        w-full justify-start
                        ${
                          selectedDrive === drive.path
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }
                      `}
                      size="sm"
                    >
                      <HardDrive
                        size={16}
                        className={`mr-2 ${
                          selectedDrive === drive.path
                            ? "text-indigo-500 dark:text-indigo-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span className="truncate">{drive.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Recent Folders */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 flex items-center">
              <Clock
                size={16}
                className="text-cyan-500 dark:text-cyan-400 mr-2"
              />
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Recent Folders
              </h4>
            </div>
            <ScrollArea className="flex-1 p-2 text-sm bg-white dark:bg-gray-900">
              {recentFolders.length === 0 ? (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400 italic">
                  No recent folders
                </div>
              ) : (
                <div className="space-y-1">
                  {recentFolders.map((folder) => (
                    <Button
                      key={folder.path}
                      onClick={() => browseFolder(folder.path)}
                      variant="ghost"
                      className="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      size="sm"
                      title={folder.path}
                    >
                      <Folder
                        size={16}
                        className="text-cyan-500 dark:text-cyan-400 mr-2"
                      />
                      <span className="truncate">{folder.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* Main subfolder list */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
            {/* Folders header with search */}
            <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center">
                <Folder
                  size={16}
                  className="text-amber-500 dark:text-amber-400 mr-2"
                />
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Folders
                </h4>

                {/* Add parent navigation button */}
                {parentPath && (
                  <Button
                    onClick={goToParent}
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft size={16} />
                    Up
                  </Button>
                )}
              </div>

              {/* Search input */}
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search folders..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-8 h-8 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>

            {/* Breadcrumbs */}
            <div className="px-4 py-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              {renderBreadcrumbs()}
            </div>

            {/* Scrollable folder area */}
            <ScrollArea className="flex-1 bg-white dark:bg-gray-900">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Loader2
                    size={32}
                    className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4"
                  />
                  <p className="text-gray-500 dark:text-gray-400">
                    Loading folders...
                  </p>
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-500 dark:text-gray-400">
                  {searchQuery ? (
                    <>
                      <Search size={32} className="mb-4 opacity-90" />
                      <p>No folders matching &quot;{searchQuery}&quot;</p>
                      <Button
                        onClick={() => setSearchQuery("")}
                        variant="link"
                        className="mt-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                      >
                        Clear search
                      </Button>
                    </>
                  ) : (
                    <>
                      <Folder size={32} className="mb-4 opacity-90" />
                      <p>No folders found in this location</p>
                    </>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <TableRow className="border-b border-gray-200 dark:border-gray-800">
                      <TableHead className="w-2/5 text-gray-700 dark:text-gray-300">
                        Name
                      </TableHead>
                      <TableHead className="w-3/5 hidden md:table-cell text-gray-700 dark:text-gray-300">
                        Path
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFolders.map((folder, index) => (
                      <TableRow
                        key={folder.path}
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-800"
                        onClick={() => browseFolder(folder.path)}
                      >
                        <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                          <div className="flex items-center">
                            <Folder
                              size={16}
                              className="text-amber-500 dark:text-amber-400 mr-2"
                            />
                            <span>{folder.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400 truncate hidden md:table-cell">
                          {folder.path}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </main>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="mr-auto text-sm text-gray-500 dark:text-gray-400">
            {filteredFolders.length > 0 && (
              <Badge
                variant="outline"
                className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30"
              >
                {filteredFolders.length} folder
                {filteredFolders.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSelectFolder}
            disabled={!path}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            Select This Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderBrowserView;
