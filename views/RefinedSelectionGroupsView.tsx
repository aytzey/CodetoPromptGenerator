// File: views/RefinedSelectionGroupsView.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, XCircle, Bookmark, Check, FolderPlus, AlertTriangle, Library, Sparkles } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { useSelectionGroupStore } from '@/stores/useSelectionGroupStore';
import { useSelectionGroupService } from '@/services/selectionGroupServiceHooks';
import type { FileNode } from '@/types';

/* helper – find node & collect descendants (files + dirs) */
function collectDesc(node: FileNode): string[] {
  if (node.type === 'file' || !node.children) return [node.relativePath];
  return [node.relativePath, ...node.children.flatMap(collectDesc)];
}

function findNode(tree: FileNode[], relPath: string): FileNode | undefined {
  for (const n of tree) {
    if (n.relativePath === relPath) return n;
    if (n.children) {
      const found = findNode(n.children, relPath);
      if (found) return found;
    }
  }
  return undefined;
}

interface RefinedSelectionGroupsViewProps {
  projectPath: string;
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  fileTree: FileNode[];
}

const RefinedSelectionGroupsView: React.FC<RefinedSelectionGroupsViewProps> = ({
  projectPath,
  selectedFilePaths,
  setSelectedFilePaths,
  fileTree,
}) => {
  const { groups, createGroup, deleteGroup, setGroupsForProject } = useSelectionGroupStore();
  const { loadAndMigrateLegacyGroups, saveCurrentGroups } = useSelectionGroupService();
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const projectGroups = useMemo(() => {
    return groups[projectPath] || {};
  }, [groups, projectPath]);

  useEffect(() => {
    if (!projectPath) {
      setActiveGroup(null);
      setSyncNotice(null);
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
    setSyncNotice(null);

    const run = async () => {
      try {
        const { migrated } = await loadAndMigrateLegacyGroups(projectPath);
        if (cancelled) return;
        if (migrated) {
          setSyncNotice("Legacy selection groups were migrated from local storage.");
        }
      } catch {
        if (!cancelled) {
          setSyncNotice(null);
        }
      }
    };

    void run().finally(() => {
      if (!cancelled) {
        setIsSyncing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectPath, loadAndMigrateLegacyGroups]);

  const handleCreateGroup = useCallback(async () => {
    const groupName = newGroupName.trim();
    if (!projectPath || !groupName || !selectedFilePaths.length || isSaving) return;

    const previousGroups = { ...projectGroups };
    createGroup(projectPath, groupName, selectedFilePaths);
    setIsSaving(true);

    const ok = await saveCurrentGroups(projectPath);
    setIsSaving(false);
    if (!ok) {
      setGroupsForProject(projectPath, previousGroups);
      return;
    }

    setNewGroupName('');
  }, [
    projectPath,
    newGroupName,
    selectedFilePaths,
    isSaving,
    projectGroups,
    createGroup,
    saveCurrentGroups,
    setGroupsForProject,
  ]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleCreateGroup();
    }
  };

  const handleSelectGroup = useCallback((groupName: string, paths: string[]) => {
    // Expand paths to include all descendants
    const expandedPaths = new Set<string>();
    
    for (const path of paths) {
      const node = findNode(fileTree, path);
      if (node) {
        const descendants = collectDesc(node);
        descendants.forEach(p => expandedPaths.add(p));
      }
    }
    
    setSelectedFilePaths(Array.from(expandedPaths));
    setActiveGroup(groupName);
  }, [fileTree, setSelectedFilePaths]);

  const handleDeleteGroup = useCallback(async (groupName: string) => {
    if (!projectPath || isSaving) return;

    const previousGroups = { ...projectGroups };
    deleteGroup(projectPath, groupName);
    if (activeGroup === groupName) {
      setActiveGroup(null);
    }

    setIsSaving(true);
    const ok = await saveCurrentGroups(projectPath);
    setIsSaving(false);
    if (!ok) {
      setGroupsForProject(projectPath, previousGroups);
    }
  }, [
    projectPath,
    isSaving,
    projectGroups,
    deleteGroup,
    activeGroup,
    saveCurrentGroups,
    setGroupsForProject,
  ]);

  if (!projectPath) {
    return (
      <Card className="glass animate-fade-in">
        <CardHeader className="glass-header">
          <CardTitle className="text-lg font-semibold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent-2))]">
            <div className="p-2 rounded-lg bg-[rgba(var(--color-secondary),0.1)] border border-[rgba(var(--color-secondary),0.2)]">
              <Library size={18} className="text-[rgb(var(--color-secondary))]" />
            </div>
            Selection Groups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-[rgb(var(--color-text-muted))]">
            <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-border),0.1)] flex items-center justify-center mb-4">
              <Library size={24} className="opacity-50" />
            </div>
            <p className="text-center">
              Select a project to manage selection groups
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass animate-fade-in">
      <CardHeader className="glass-header">
        <CardTitle className="text-lg font-semibold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent-2))]">
          <div className="p-2 rounded-lg bg-[rgba(var(--color-secondary),0.1)] border border-[rgba(var(--color-secondary),0.2)]">
            <Library size={18} className="text-[rgb(var(--color-secondary))]" />
          </div>
          Selection Groups
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Create Group Section */}
        <div className="space-y-4">
          <div className="flex items-center">
            <FolderPlus size={14} className="mr-2 text-[rgb(var(--color-secondary))]" />
            <span className="text-sm text-[rgb(var(--color-text-secondary))]">Create Group</span>
          </div>
          
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Group name..."
                className="bg-[rgba(var(--color-bg-secondary),0.5)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-secondary))] focus:ring-[rgb(var(--color-secondary))] text-[rgb(var(--color-text-primary))]"
              />
              {newGroupName && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))]"
                  onClick={() => setNewGroupName('')}
                >
                  <XCircle size={14} />
                </Button>
              )}
            </div>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || !selectedFilePaths.length || isSaving || isSyncing}
              size="sm"
              className="bg-[rgb(var(--color-secondary))] hover:bg-[rgba(var(--color-secondary),0.9)] text-white shadow-[0_4px_12px_rgba(var(--color-secondary),0.3)]"
            >
              <Plus size={14} className="mr-1" />
              {isSaving ? 'Saving...' : 'Create'}
            </Button>
          </div>

          {syncNotice && (
            <div className="text-xs text-[rgb(var(--color-secondary))] flex items-center">
              <Check size={12} className="mr-1" />
              {syncNotice}
            </div>
          )}
          
          {selectedFilePaths.length === 0 && (
            <div className="text-xs text-[rgb(var(--color-warning))] flex items-center">
              <AlertTriangle size={12} className="mr-1" />
              Select files first to create a group
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="relative">
          <Separator className="bg-[rgba(var(--color-border),0.5)]" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 px-2 bg-[rgb(var(--color-bg-tertiary))]">
            <Bookmark size={14} className="text-[rgb(var(--color-text-muted))]" />
          </div>
        </div>

        {/* Groups List */}
        {isSyncing ? (
          <div className="flex flex-col items-center justify-center py-8 text-[rgb(var(--color-text-muted))]">
            <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-border),0.1)] flex items-center justify-center mb-4">
              <Library size={24} className="opacity-50 animate-pulse" />
            </div>
            <p className="text-sm">Loading groups...</p>
          </div>
        ) : Object.keys(projectGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[rgb(var(--color-text-muted))]">
            <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-border),0.1)] flex items-center justify-center mb-4">
              <Sparkles size={24} className="opacity-50" />
            </div>
            <p className="text-lg font-medium">No groups yet</p>
            <p className="text-sm opacity-80 text-center max-w-xs">
              Create groups to save and quickly restore file selections
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <ul className="space-y-2">
              {Object.entries(projectGroups).map(([name, paths]) => (
                <li key={name} className="group">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            onClick={() => handleSelectGroup(name, paths)}
                            className={`flex justify-between items-center w-full h-auto text-sm p-3 rounded-lg border transition-all duration-200 ${
                              activeGroup === name
                                ? 'bg-[rgba(var(--color-secondary),0.1)] border-[rgba(var(--color-secondary),0.3)] text-[rgb(var(--color-text-primary))]'
                                : 'bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.2)] text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-secondary),0.05)] hover:border-[rgba(var(--color-secondary),0.2)]'
                            }`}
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <Bookmark size={14} className={`mr-2 flex-shrink-0 ${activeGroup === name ? 'text-[rgb(var(--color-secondary))]' : 'text-[rgb(var(--color-secondary))]'}`} />
                              <span className="truncate font-medium">{name}</span>
                              {activeGroup === name && (
                                <div className="ml-2 p-0.5 rounded-full bg-[rgba(var(--color-secondary),0.2)]">
                                  <Check size={12} className="text-[rgb(var(--color-secondary))]" />
                                </div>
                              )}
                            </div>
                            <Badge className="ml-2 px-2 py-0.5 text-[10px] font-normal bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] border border-[rgba(var(--color-primary),0.3)]">
                              {paths.length}
                            </Badge>
                          </Button>
                          
                          {/* Delete button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isSaving}
                                  className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 bg-[rgba(var(--color-error),0.1)] hover:bg-[rgba(var(--color-error),0.2)] text-[rgba(var(--color-error),0.7)] hover:text-[rgb(var(--color-error))] rounded-l-none transition-all duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeleteGroup(name);
                                  }}
                                  aria-label={`Delete group ${name}`}
                                >
                                  <XCircle size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="glass py-1 px-2 shadow-lg">
                                <p className="text-xs">Delete group &ldquo;{name}&rdquo;</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="glass py-2 px-3 shadow-lg">
                        <p className="text-xs">Click to select {paths.length} files in this group</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        
        {/* Help text */}
        <div className="text-xs text-[rgb(var(--color-text-muted))] p-3 bg-[rgba(var(--color-secondary),0.05)] rounded-lg border border-[rgba(var(--color-secondary),0.1)]">
          <div className="flex items-center gap-2 mb-1 text-[rgb(var(--color-secondary))]">
            <Library size={12} />
            <span className="font-medium">About selection groups:</span>
          </div>
          <p>Groups let you save and quickly restore sets of selected files for this project.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefinedSelectionGroupsView;
