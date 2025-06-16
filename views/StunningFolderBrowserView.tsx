// views/StunningFolderBrowserView.tsx
// Behance-worthy folder browser with modern design

import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Folder,
  HardDrive,
  Search,
  Loader2,
  FolderOpen,
  Home,
  ChevronRight,
  X,
  Check,
  ArrowLeft,
  Monitor,
  Sparkles,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FolderItem {
  name: string;
  path: string;
}

interface StunningFolderBrowserViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath?: string;
}

export default function StunningFolderBrowserView({
  isOpen,
  onClose,
  onSelect,
  currentPath = '',
}: StunningFolderBrowserViewProps) {
  const [path, setPath] = useState(currentPath);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [drives, setDrives] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Breadcrumb navigation
  const pathParts = path ? path.split(/[/\\]/).filter(Boolean) : [];
  
  // Filter folders based on search
  const filtered = folders.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  // API base URL
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

  // Load drives on mount
  useEffect(() => {
    if (isOpen) {
      loadDrives();
      if (currentPath) {
        setPath(currentPath);
        browse(currentPath);
      }
    }
  }, [isOpen, currentPath]);

  const loadDrives = async () => {
    try {
      const response = await fetch(`${API}/api/select_drives`);
      if (response.ok) {
        const data = await response.json();
        const drives = Array.isArray(data) ? data : data.drives || [];
        const normalizedDrives = drives.map((drive: any) => 
          typeof drive === 'string' 
            ? { name: drive, path: drive }
            : { name: drive.name || drive.path, path: drive.path || drive.name }
        );
        setDrives(normalizedDrives);
        if (!path && normalizedDrives.length > 0) {
          browse(normalizedDrives[0].path);
        }
      }
    } catch (error) {
      console.error('Failed to load drives:', error);
    }
  };

  const browse = async (newPath: string) => {
    setLoading(true);
    setSearch(''); // Clear search when browsing
    try {
      const response = await fetch(`${API}/api/browse_folders?path=${encodeURIComponent(newPath)}`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
        setPath(data.current_path || newPath);
      }
    } catch (error) {
      console.error('Failed to browse folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    const separator = path.includes('\\') ? '\\' : '/';
    const parts = path.split(/[/\\]/).slice(0, -1);
    let parent;
    
    if (path.startsWith('/')) {
      // Unix-like path
      parent = parts.length > 0 ? '/' + parts.join('/') : '/';
    } else {
      // Windows or other path
      parent = parts.join(separator);
    }
    
    if (parent && parent !== path) {
      browse(parent);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    // Reconstruct the full path properly
    const selectedParts = pathParts.slice(0, index + 1);
    let newPath;
    
    // Determine the original separator used in the path
    const separator = path.includes('\\') ? '\\' : '/';
    
    // Handle different OS path formats
    if (path.startsWith('/')) {
      // Unix-like path - always starts with /
      newPath = '/' + selectedParts.join('/');
    } else if (pathParts[0] && pathParts[0].includes(':')) {
      // Windows path with drive letter
      newPath = selectedParts.join(separator);
    } else {
      // Relative or other path
      newPath = selectedParts.join(separator);
    }
    
    console.log('Breadcrumb navigation:', { index, selectedParts, originalPath: path, newPath });
    browse(newPath);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 flex flex-col glass border-[rgba(var(--color-border),0.3)] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        {/* Stunning Header */}
        <DialogHeader className="glass-header p-6 border-b border-[rgba(var(--color-border),0.2)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))] rounded-xl shadow-[0_8px_24px_rgba(var(--color-primary),0.3)]">
                <FolderOpen size={24} className="text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))]">
                  Select Folder
                </DialogTitle>
                <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
                  Choose a project directory to work with
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full h-10 w-10 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-error),0.1)] hover:text-[rgb(var(--color-error))]"
            >
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-80 border-r border-[rgba(var(--color-border),0.2)] flex flex-col glass-header">
            {/* Drives Section */}
            <div className="p-4 border-b border-[rgba(var(--color-border),0.2)]">
              <div className="flex items-center mb-3">
                <Monitor size={16} className="text-[rgb(var(--color-primary))] mr-2" />
                <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">Drives</span>
              </div>
              <div className="space-y-1">
                {drives.map(drive => (
                  <Button
                    key={drive.path}
                    variant="ghost"
                    onClick={() => browse(drive.path)}
                    className="w-full justify-start h-9 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-primary),0.1)] hover:text-[rgb(var(--color-primary))] transition-all"
                  >
                    <HardDrive size={14} className="mr-2" />
                    <span className="truncate">{drive.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4">
              <div className="flex items-center mb-3">
                <Sparkles size={16} className="text-[rgb(var(--color-accent-2))] mr-2" />
                <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">Quick Actions</span>
              </div>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={navigateUp}
                  disabled={!path || pathParts.length === 0}
                  className="w-full justify-start h-9 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-accent-2),0.1)] hover:text-[rgb(var(--color-accent-2))] transition-all"
                >
                  <ArrowLeft size={14} className="mr-2" />
                  Go Up
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => browse(drives[0]?.path || '')}
                  disabled={!drives.length}
                  className="w-full justify-start h-9 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-secondary),0.1)] hover:text-[rgb(var(--color-secondary))] transition-all"
                >
                  <Home size={14} className="mr-2" />
                  Home
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col">
            {/* Navigation Bar */}
            <div className="p-4 border-b border-[rgba(var(--color-border),0.2)] glass-header">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center space-x-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => browse(drives[0]?.path || '')}
                  className="h-8 px-2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-primary))]"
                >
                  <Home size={14} />
                </Button>
                {pathParts.map((part, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight size={14} className="text-[rgb(var(--color-text-muted))]" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToBreadcrumb(index)}
                      className="h-8 px-2 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-primary))] font-mono text-xs"
                    >
                      {part}
                    </Button>
                  </React.Fragment>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search folders..."
                  className="pl-9 bg-[rgba(var(--color-bg-secondary),0.5)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))]"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearch('')}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </div>

            {/* Current Path Display */}
            <div className="px-4 py-2 border-b border-[rgba(var(--color-border),0.1)] bg-[rgba(var(--color-bg-secondary),0.3)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[rgb(var(--color-text-muted))] truncate">
                  {path || 'No folder selected'}
                </span>
                {filtered.length > 0 && (
                  <Badge className="bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] border border-[rgba(var(--color-primary),0.3)]">
                    {filtered.length} folders
                  </Badge>
                )}
              </div>
            </div>

            {/* Folder List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-[rgb(var(--color-text-muted))]">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full border-2 border-[rgba(var(--color-primary),0.3)] border-t-[rgb(var(--color-primary))] animate-spin"></div>
                    <Loader2 size={20} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[rgb(var(--color-primary))]" />
                  </div>
                  <p className="text-lg font-medium">Loading folders...</p>
                  <p className="text-sm opacity-70">Please wait while we scan the directory</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-[rgb(var(--color-text-muted))]">
                  <div className="w-20 h-20 rounded-full bg-[rgba(var(--color-border),0.1)] flex items-center justify-center mb-4">
                    <Folder size={32} className="opacity-50" />
                  </div>
                  <p className="text-lg font-medium">
                    {search ? 'No matching folders found' : 'No folders here'}
                  </p>
                  <p className="text-sm opacity-70 mt-1">
                    {search ? 'Try adjusting your search terms' : 'This directory appears to be empty'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filtered.map(folder => (
                    <div
                      key={folder.path}
                      onClick={() => browse(folder.path)}
                      className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-[rgba(var(--color-primary),0.05)] hover:border-[rgba(var(--color-primary),0.2)] border border-transparent transition-all duration-200 group"
                    >
                      <div className="p-2 rounded-lg bg-[rgba(var(--color-warning),0.1)] border border-[rgba(var(--color-warning),0.2)] mr-3 group-hover:bg-[rgba(var(--color-warning),0.15)]">
                        <Folder size={18} className="text-[rgb(var(--color-warning))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[rgb(var(--color-text-primary))] truncate">
                          {folder.name}
                        </p>
                        <p className="text-xs text-[rgb(var(--color-text-muted))] truncate font-mono">
                          {folder.path}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-[rgb(var(--color-text-muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </main>
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 border-t border-[rgba(var(--color-border),0.2)] glass-header">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-[rgb(var(--color-text-muted))]">
              {path ? (
                <span className="font-mono">{path}</span>
              ) : (
                'No folder selected'
              )}
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-border),0.1)]"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => onSelect(path)} 
                disabled={!path}
                className="bg-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.9)] text-white shadow-[0_4px_16px_rgba(var(--color-primary),0.3)]"
              >
                <Check size={16} className="mr-2" />
                Select This Folder
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}