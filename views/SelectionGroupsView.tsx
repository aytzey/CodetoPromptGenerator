// File: views/SelectionGroupsView.tsx
// FIX: Correct Zustand state selection to prevent infinite loops.
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, XCircle } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useSelectionGroupStore } from '@/stores/useSelectionGroupStore';
import type { FileNode } from '@/types';

/* helper – find node & collect descendants (files + dirs) */
function collectDesc(node: FileNode): string[] {
  if (node.type === 'file' || !node.children) return [node.relativePath];
  // Include the directory itself IF NEEDED, otherwise filter it out if only files are desired.
  // Current logic includes directories. Decide based on how `selectedPaths` is used elsewhere.
  // If only files should ever be in selectedPaths, filter node.relativePath if node.type === 'directory'.
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
  const { saveGroup, deleteGroup } = useSelectionGroupStore();

  // --- FIX: Improved State Selection ---
  // Select the entire groups object first. Zustand's default shallow compare
  // will prevent re-renders if the top-level `groups` reference hasn't changed.
  const allGroups = useSelectionGroupStore(state => state.groups);

  // Derive the specific project's groups using useMemo for stability.
  // This ensures `groups` only gets a new reference if `allGroups` or `projectPath` changes.
  const groups = useMemo(() => allGroups[projectPath] ?? {}, [allGroups, projectPath]);
  // --- End Fix ---


  /* ––––– handlers ––––– */
  const handleSave = () => {
    const name = newName.trim();
    if (!name || !projectPath) return; // Guard against empty name or path
    saveGroup(projectPath, name, selectedPaths);
    setNewName('');
  };

  const applyGroup = useCallback(
    (pathsToApply: string[]) => {
      if (!projectPath || !fileTree || fileTree.length === 0) return; // Guard missing data

      const finalPaths = new Set<string>();
      pathsToApply.forEach(p => {
        const node = findNode(fileTree, p);
        if (node) {
          // Collect descendants, ensuring we only add valid file paths if that's the requirement
          // Adjust collectDesc if necessary to exclude directory paths themselves from the selection.
          collectDesc(node).forEach(descPath => finalPaths.add(descPath));
        } else {
          // Handle case where a saved path no longer exists in the tree?
          // Option 1: Silently ignore
           console.warn(`Path "${p}" from group not found in current file tree.`);
          // Option 2: Add it anyway (might cause issues downstream if selection expects valid files)
          // finalPaths.add(p);
        }
      });
      onSelectPaths(Array.from(finalPaths));
    },
    [fileTree, onSelectPaths, projectPath], // Added projectPath dependency
  );

  // Check if the project path is valid before rendering group controls
  if (!projectPath) {
    return (
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
        <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            📁 Selection Groups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
           <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic py-4">
             Select a project to manage selection groups.
           </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
      <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          📁 Selection Groups
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* create */}
        <div className="flex gap-2">
          <Input
            placeholder="e.g. frontend"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="h-9"
          />
          <Button
            size="sm"
            disabled={!newName.trim() || selectedPaths.length === 0}
            onClick={handleSave}
          >
            <Plus size={14} className="mr-1" />
            Save Current
          </Button>
        </div>

        {/* list */}
        {Object.keys(groups).length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-2">
            No groups saved for this project yet.
          </p>
        ) : (
          <ScrollArea className="h-[120px] pr-2 border rounded-md p-1 border-gray-100 dark:border-gray-800">
            <ul className="space-y-1">
              {Object.entries(groups).map(([name, paths]) => (
                <li key={name} className="flex items-center gap-1.5">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start truncate h-7 text-xs"
                          onClick={() => applyGroup(paths)}
                          title={`Apply group: ${name}`}
                        >
                          <span className="truncate">{name}</span>
                          <Badge
                            variant="secondary"
                            className="ml-auto px-1.5 py-0 text-[10px] font-normal"
                          >
                            {paths.length}
                          </Badge>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Click to select {paths.length} paths from this group.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                   <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-rose-500/70 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex-shrink-0"
                              onClick={() => deleteGroup(projectPath, name)}
                              aria-label={`Delete group ${name}`}
                            >
                              <XCircle size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                           <p>Delete group "{name}"</p>
                        </TooltipContent>
                      </Tooltip>
                   </TooltipProvider>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SelectionGroupsView; // No React.memo needed with correct Zustand usage