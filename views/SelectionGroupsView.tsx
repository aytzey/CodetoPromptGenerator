// File: views/SelectionGroupsView.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, XCircle, Bookmark, Check, FolderPlus, AlertTriangle, Library } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { useSelectionGroupStore } from '@/stores/useSelectionGroupStore';
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
      const f = findNode(n.children, relPath);
      if (f) return f;
    }
  }
  return undefined;
}

interface Props {
  projectPath: string;
  fileTree: FileNode[];
  selectedPaths: string[];
  onSelectPaths(paths: string[]): void;
}

const SelectionGroupsView: React.FC<Props> = ({
  projectPath,
  fileTree,
  selectedPaths,
  onSelectPaths,
}) => {
  const [newName, setNewName] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const { saveGroup, deleteGroup } = useSelectionGroupStore();

  // Improved State Selection
  const allGroups = useSelectionGroupStore(state => state.groups);

  // Derive the specific project's groups using useMemo for stability
  const groups = useMemo(() => allGroups[projectPath] ?? {}, [allGroups, projectPath]);

  /* ––––– handlers ––––– */
  const handleSave = () => {
    const name = newName.trim();
    if (!name || !projectPath) return; // Guard against empty name or path
    saveGroup(projectPath, name, selectedPaths);
    setNewName('');
  };

  const applyGroup = useCallback(
    (pathsToApply: string[], groupName: string) => {
      if (!projectPath || !fileTree || fileTree.length === 0) return; // Guard missing data

      const finalPaths = new Set<string>();
      pathsToApply.forEach(p => {
        const node = findNode(fileTree, p);
        if (node) {
          // Collect descendants, ensuring we only add valid file paths
          collectDesc(node).forEach(descPath => finalPaths.add(descPath));
        } else {
          console.warn(`Path "${p}" from group not found in current file tree.`);
        }
      });
      
      // Set this as the active group
      setActiveGroup(groupName);
      
      // Apply the selection
      onSelectPaths(Array.from(finalPaths));
    },
    [fileTree, onSelectPaths, projectPath],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newName.trim() && selectedPaths.length > 0) {
      handleSave();
    }
  };

  // Check if the project path is valid before rendering group controls
  if (!projectPath) {
    return (
      <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm animate-fade-in">
        <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(80,250,123)] to-[rgb(139,233,253)]">
            <Library size={16} className="text-[rgb(80,250,123)]" />
            Selection Groups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-[rgba(22,23,46,0.5)]">
          <div className="flex flex-col items-center justify-center py-4 text-[rgb(140,143,170)]">
            <AlertTriangle size={24} className="mb-2 opacity-50" />
            <p className="text-xs text-center italic">
              Select a project to manage selection groups.
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

      <CardContent className="p-4 space-y-4 bg-[rgba(22,23,46,0.5)]">
        {/* Create new group */}
        <div className="space-y-3">
          <div className="flex items-center mb-1">
            <FolderPlus size={14} className="mr-1.5 text-[rgb(80,250,123)]" />
            <span className="text-sm text-[rgb(190,192,210)]">Create Group</span>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Group name (e.g. frontend)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-9 bg-[rgba(22,23,46,0.6)] border-[rgba(60,63,87,0.7)] focus:ring-1 focus:ring-[rgb(80,250,123)] focus:border-transparent text-[rgb(224,226,240)]"
              />
              {newName && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-[rgb(140,143,170)] hover:text-[rgb(224,226,240)]"
                  onClick={() => setNewName('')}
                >
                  <XCircle size={14} />
                </Button>
              )}
            </div>
            <Button
              size="sm"
              disabled={!newName.trim() || selectedPaths.length === 0}
              onClick={handleSave}
              className="bg-gradient-to-r from-[rgb(80,250,123)] to-[rgb(80,250,123)] hover:from-[rgb(80,250,123)] hover:to-[rgb(139,233,253)] text-[rgb(15,16,36)] font-medium shadow-[0_2px_10px_rgba(80,250,123,0.25)]"
            >
              <Plus size={14} className="mr-1.5" />
              Save
            </Button>
          </div>
          
          {selectedPaths.length === 0 && (
            <div className="text-xs text-[rgb(255,121,198)] flex items-center">
              <AlertTriangle size={12} className="mr-1" />
              Select files first to create a group
            </div>
          )}
        </div>

        {/* Separator with stats */}
        <div className="relative flex items-center justify-center">
          <Separator className="bg-[rgba(60,63,87,0.5)]" />
          <Badge className="absolute px-2 bg-[rgba(22,23,46,0.8)] border-0 text-[rgb(140,143,170)]">
            {Object.keys(groups).length} Groups
          </Badge>
        </div>

        {/* Group list */}
        {Object.keys(groups).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-[rgb(140,143,170)]">
            <Bookmark size={24} className="mb-2 opacity-50" />
            <p className="text-xs text-center italic">
              No groups saved for this project yet.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[140px] pr-2 border rounded-md border-[rgba(60,63,87,0.7)] bg-[rgba(15,16,36,0.2)] p-1.5">
            <ul className="space-y-2">
              {Object.entries(groups).map(([name, paths], index) => (
                <li 
                  key={name} 
                  className="animate-fade-in" 
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative group">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex justify-between items-center w-full h-9 text-xs pl-3 pr-2 
                              ${activeGroup === name 
                                ? 'bg-[rgba(80,250,123,0.15)] border-[rgba(80,250,123,0.4)] text-[rgb(224,226,240)]' 
                                : 'bg-[rgba(22,23,46,0.6)] border-[rgba(60,63,87,0.7)] text-[rgb(190,192,210)] hover:bg-[rgba(80,250,123,0.1)] hover:border-[rgba(80,250,123,0.3)] hover:text-[rgb(224,226,240)]'
                              } transition-all duration-200`}
                            onClick={() => applyGroup(paths, name)}
                            title={`Apply group: ${name}`}
                          >
                            <div className="flex items-center">
                              <Bookmark size={14} className={`mr-2 ${activeGroup === name ? 'text-[rgb(80,250,123)]' : 'text-[rgb(80,250,123)]'}`} />
                              <span className="truncate font-medium">{name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {activeGroup === name && (
                                <div className="p-0.5 rounded-full bg-[rgba(80,250,123,0.2)]">
                                  <Check size={12} className="text-[rgb(80,250,123)]" />
                                </div>
                              )}
                              <Badge
                                variant="secondary"
                                className="ml-auto px-2 py-0.5 text-[10px] font-normal bg-[rgba(123,147,253,0.1)] text-[rgb(123,147,253)] border border-[rgba(123,147,253,0.3)]"
                              >
                                {paths.length}
                              </Badge>
                            </div>
                          </Button>
                          
                          {/* Delete button - appears on hover */}
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 bg-[rgba(255,85,85,0.1)] hover:bg-[rgba(255,85,85,0.2)] text-[rgba(255,85,85,0.7)] hover:text-[rgb(255,85,85)] rounded-l-none transition-all duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteGroup(projectPath, name);
                                    if (activeGroup === name) setActiveGroup(null);
                                  }}
                                  aria-label={`Delete group ${name}`}
                                >
                                  <XCircle size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                                <p>Delete group "{name}"</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="w-auto max-w-xs bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                        <p>Click to select {paths.length} files in this group</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        
        {/* Help text */}
        <div className="text-xs text-[rgb(140,143,170)] pt-1">
          Groups let you save and quickly restore sets of selected files.
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectionGroupsView;