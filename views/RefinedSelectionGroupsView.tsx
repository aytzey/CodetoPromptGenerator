import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  Check,
  FolderPlus,
  Library,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSelectionGroupService } from "@/services/selectionGroupServiceHooks";
import { useSelectionGroupStore } from "@/stores/useSelectionGroupStore";
import type { FileNode } from "@/types";

interface RefinedSelectionGroupsViewProps {
  projectPath: string;
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  fileTree: FileNode[];
}

const collectDescendants = (node: FileNode): string[] => {
  if (node.type === "file" || !node.children) return [node.relativePath];
  return [node.relativePath, ...node.children.flatMap(collectDescendants)];
};

const findNodeByRelativePath = (tree: FileNode[], relativePath: string): FileNode | undefined => {
  for (const node of tree) {
    if (node.relativePath === relativePath) return node;
    if (node.children) {
      const found = findNodeByRelativePath(node.children, relativePath);
      if (found) return found;
    }
  }
  return undefined;
};

const RefinedSelectionGroupsView: React.FC<RefinedSelectionGroupsViewProps> = ({
  projectPath,
  selectedFilePaths,
  setSelectedFilePaths,
  fileTree,
}) => {
  const { groups, createGroup, deleteGroup, setGroupsForProject } = useSelectionGroupStore();
  const { loadAndMigrateLegacyGroups, saveCurrentGroups } = useSelectionGroupService();

  const [newGroupName, setNewGroupName] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const projectGroups = useMemo(() => groups[projectPath] || {}, [groups, projectPath]);
  const groupEntries = useMemo(
    () => Object.entries(projectGroups).sort(([a], [b]) => a.localeCompare(b)),
    [projectGroups],
  );

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
        if (!cancelled && migrated) {
          setSyncNotice("Legacy selection groups migrated from local storage.");
        }
      } catch {
        if (!cancelled) setSyncNotice(null);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [projectPath, loadAndMigrateLegacyGroups]);

  const handleCreateGroup = useCallback(async () => {
    const groupName = newGroupName.trim();
    if (!projectPath || !groupName || selectedFilePaths.length === 0 || isSaving) return;

    const previousGroups = { ...projectGroups };
    createGroup(projectPath, groupName, selectedFilePaths);
    setIsSaving(true);
    const ok = await saveCurrentGroups(projectPath);
    setIsSaving(false);

    if (!ok) {
      setGroupsForProject(projectPath, previousGroups);
      return;
    }

    setNewGroupName("");
  }, [
    newGroupName,
    projectGroups,
    projectPath,
    selectedFilePaths,
    isSaving,
    createGroup,
    saveCurrentGroups,
    setGroupsForProject,
  ]);

  const handleSelectGroup = useCallback(
    (groupName: string, paths: string[]) => {
      const expanded = new Set<string>();
      paths.forEach((path) => {
        const node = findNodeByRelativePath(fileTree, path);
        if (!node) return;
        collectDescendants(node).forEach((item) => expanded.add(item));
      });
      setSelectedFilePaths(Array.from(expanded));
      setActiveGroup(groupName);
    },
    [fileTree, setSelectedFilePaths],
  );

  const handleDeleteGroup = useCallback(
    async (groupName: string) => {
      if (!projectPath || isSaving) return;

      const previousGroups = { ...projectGroups };
      deleteGroup(projectPath, groupName);
      if (activeGroup === groupName) setActiveGroup(null);

      setIsSaving(true);
      const ok = await saveCurrentGroups(projectPath);
      setIsSaving(false);
      if (!ok) {
        setGroupsForProject(projectPath, previousGroups);
      }
    },
    [
      projectPath,
      projectGroups,
      activeGroup,
      isSaving,
      deleteGroup,
      saveCurrentGroups,
      setGroupsForProject,
    ],
  );

  const onCreateKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCreateGroup();
    }
  };

  if (!projectPath) {
    return (
      <Card className="glass">
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2 text-center text-sm text-[rgb(var(--color-text-muted))]">
            <Library className="h-7 w-7 opacity-70" />
            Select a project first to manage selection groups.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Library size={16} className="text-[rgb(var(--color-secondary))]" />
          Selection Groups
          <Badge variant="outline" className="ml-auto">
            {groupEntries.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.25)] p-3 text-xs text-[rgb(var(--color-text-muted))]">
          Save selected files as reusable groups, then restore them with one click.
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={onCreateKeyDown}
              placeholder="Group name..."
              className="h-9 pr-8"
              disabled={isSaving || isSyncing}
            />
            {newGroupName && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))]"
                onClick={() => setNewGroupName("")}
                aria-label="Clear group name"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Button
            onClick={() => void handleCreateGroup()}
            size="sm"
            className="h-9"
            disabled={!newGroupName.trim() || selectedFilePaths.length === 0 || isSaving || isSyncing}
          >
            {isSaving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}
            Create
          </Button>
        </div>

        {syncNotice && (
          <p className="inline-flex items-center gap-1 text-xs text-[rgb(var(--color-secondary))]">
            <Check size={12} />
            {syncNotice}
          </p>
        )}

        {selectedFilePaths.length === 0 && (
          <p className="inline-flex items-center gap-1 text-xs text-[rgb(var(--color-warning))]">
            <AlertTriangle size={12} />
            Select files first to create a group.
          </p>
        )}

        {isSyncing ? (
          <div className="flex items-center justify-center gap-2 rounded-md border border-[rgba(var(--color-border),0.35)] py-8 text-sm text-[rgb(var(--color-text-muted))]">
            <Loader2 size={16} className="animate-spin" />
            Loading groups...
          </div>
        ) : groupEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-[rgba(var(--color-border),0.4)] py-8 text-sm text-[rgb(var(--color-text-muted))]">
            <FolderPlus className="h-6 w-6 opacity-70" />
            No groups yet.
          </div>
        ) : (
          <ScrollArea className="h-[200px] rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-2">
            <ul className="space-y-2">
              {groupEntries.map(([name, paths]) => {
                const isActive = activeGroup === name;
                return (
                  <li key={name} className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className={`h-auto flex-1 justify-between rounded-md border px-3 py-2 ${
                        isActive
                          ? "border-[rgba(var(--color-secondary),0.45)] bg-[rgba(var(--color-secondary),0.12)]"
                          : "border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.45)]"
                      }`}
                      onClick={() => handleSelectGroup(name, paths)}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Bookmark size={14} className="text-[rgb(var(--color-secondary))]" />
                        <span className="truncate text-sm">{name}</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        {isActive ? <Check size={13} className="text-[rgb(var(--color-secondary))]" /> : null}
                        <Badge variant="outline" className="text-[10px]">
                          {paths.length}
                        </Badge>
                      </span>
                    </Button>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[rgb(var(--color-error))]"
                            onClick={() => void handleDeleteGroup(name)}
                            disabled={isSaving}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Delete group</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RefinedSelectionGroupsView;
