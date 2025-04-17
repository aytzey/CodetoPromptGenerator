// views/SelectionGroupsView.tsx
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

/* helper – find node & collect descendants (files + dirs) */
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
  const { saveGroup, deleteGroup, listGroups } = useSelectionGroupStore();

  const groups = useMemo(() => listGroups(projectPath), [listGroups, projectPath]);

  /* ––––– handlers ––––– */
  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    saveGroup(projectPath, name, selectedPaths);
    setNewName('');
  };

  const applyGroup = useCallback(
    (paths: string[]) => {
      const final = new Set<string>();
      paths.forEach(p => {
        const node = findNode(fileTree, p);
        if (node) collectDesc(node).forEach(x => final.add(x));
      });
      onSelectPaths(Array.from(final));
    },
    [fileTree, onSelectPaths],
  );

  return (
    <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70">
      <CardHeader className="py-3 px-4 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          📁 Selection Groups
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
            Save
          </Button>
        </div>

        {/* list */}
        {Object.keys(groups).length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            No groups saved for this project.
          </p>
        ) : (
          <ScrollArea className="h-[120px] pr-2">
            <ul className="space-y-1">
              {Object.entries(groups).map(([name, paths]) => (
                <li key={name} className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start truncate"
                          onClick={() => applyGroup(paths)}
                          title="Apply group"
                        >
                          {name}
                          <Badge
                            variant="secondary"
                            className="ml-2 px-1.5 py-0 text-xs"
                          >
                            {paths.length}
                          </Badge>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Click to re‑select {paths.length} paths
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-rose-500 hover:text-rose-700"
                    onClick={() => deleteGroup(projectPath, name)}
                  >
                    <XCircle size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SelectionGroupsView;
