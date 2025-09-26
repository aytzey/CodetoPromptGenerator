// FILE: views/RefinedLocalExclusionsManagerView.tsx
import React, { useEffect, useState } from "react";
import {
  FileX,
  Plus,
  X,
  Loader2,
  Filter,
  Settings,
  Info,
  Sparkles,
  FolderOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GlassPanel from "@/components/layout/GlassPanel";

import { useExclusionStore } from "@/stores/useExclusionStore";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";

const RefinedLocalExclusionsManagerView: React.FC = () => {
  const projectPath = useProjectStore(s => s.projectPath);
  const localExclusions = useExclusionStore(s => s.localExclusions);
  const isLoadingLocal = useExclusionStore(s => s.isLoadingLocal);
  const isSavingLocal = useExclusionStore(s => s.isSavingLocal);
  const error = useAppStore(s => s.error);

  const { fetchLocalExclusions, updateLocalExclusions } = useExclusionService();

  const [newExclusion, setNewExclusion] = useState("");

  // Common project-specific exclusion patterns
  const suggestions = [
    "*.test.js",
    "*.spec.ts", 
    "*.test.tsx",
    "test/",
    "tests/",
    "__tests__/",
    "*.min.js",
    "*.min.css",
    "*.map",
    ".cache/",
    "tmp/",
    "temp/",
    "logs/",
    "*.backup"
  ];

  useEffect(() => {
    if (projectPath) {
      fetchLocalExclusions();
    }
  }, [projectPath, fetchLocalExclusions]);

  const addEntry = async () => {
    if (!newExclusion.trim() || localExclusions.includes(newExclusion.trim())) {
      return;
    }
    
    const updated = [...localExclusions, newExclusion.trim()];
    await updateLocalExclusions(updated);
    setNewExclusion("");
  };

  const rmEntry = async (exclusion: string) => {
    const updated = localExclusions.filter(e => e !== exclusion);
    await updateLocalExclusions(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addEntry();
    }
  };

  if (!projectPath) {
    return (
      <GlassPanel
        tone="neutral"
        title="Project Exclusions"
        description="Select a project to manage project-specific exclusions."
        icon={<FolderOpen className="h-5 w-5" />}
        contentClassName="py-12 flex flex-col items-center text-center space-y-3"
      >
        <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-border),0.12)] flex items-center justify-center">
          <FolderOpen className="h-7 w-7 text-[rgb(var(--color-text-muted))]" />
        </div>
        <h3 className="text-lg font-medium text-[rgb(var(--color-text-secondary))]">
          No Project Selected
        </h3>
        <p className="text-sm text-[rgb(var(--color-text-muted))] max-w-md">
          Choose a project with the folder picker to populate and customise project-level exclusions.
        </p>
      </GlassPanel>
    );
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {localExclusions.length > 0 && (
        <Badge className="bg-[rgba(var(--color-tertiary),0.1)] text-[rgb(var(--color-tertiary))] border border-[rgba(var(--color-tertiary),0.3)]">
          {localExclusions.length} patterns
        </Badge>
      )}
      {isLoadingLocal && (
        <Badge className="bg-[rgba(var(--color-info),0.12)] text-[rgb(var(--color-info))] border border-[rgba(var(--color-info),0.25)]">
          <Loader2 size={12} className="animate-spin mr-1.5" />
          Loading…
        </Badge>
      )}
      {isSavingLocal && (
        <Badge className="bg-[rgba(var(--color-warning),0.12)] text-[rgb(var(--color-warning))] border border-[rgba(var(--color-warning),0.25)] animate-pulse">
          <Loader2 size={12} className="animate-spin mr-1.5" />
          Saving…
        </Badge>
      )}
    </div>
  );

  return (
    <GlassPanel
      tone="tertiary"
      title="Project Exclusions"
      description="Patterns excluded from this project only"
      icon={<FileX className="h-5 w-5" />}
      actions={headerActions}
    >
        {/* Error Alert */}
        {error && (
          <Alert className="bg-[rgba(var(--color-error),0.1)] text-[rgb(var(--color-error))] border border-[rgba(var(--color-error),0.3)]">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Add New Exclusion */}
        <div className="space-y-4">
          <div className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-2">
            <Plus size={14} className="text-[rgb(var(--color-tertiary))]" />
            <span>Add new exclusion pattern</span>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., *.test.js, test/, __tests__/"
                className="pl-9 bg-[rgba(var(--color-bg-secondary),0.5)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-tertiary))] focus:ring-[rgb(var(--color-tertiary))] text-[rgb(var(--color-text-primary))]"
              />
              <FileX className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={addEntry}
                    disabled={!newExclusion.trim() || localExclusions.includes(newExclusion.trim()) || isSavingLocal}
                    className="bg-[rgb(var(--color-tertiary))] hover:bg-[rgba(var(--color-tertiary),0.9)] text-white shadow-[0_4px_12px_rgba(var(--color-tertiary),0.3)]"
                  >
                    {isSavingLocal ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="glass py-2 px-3 shadow-lg">
                  <p className="text-xs">Add pattern to project exclusions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Quick suggestions */}
          {!newExclusion && (
            <div className="border rounded-lg p-4 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.3)]">
              <div className="flex items-center mb-3 text-sm text-[rgb(var(--color-text-secondary))]">
                <Settings size={14} className="mr-2 text-[rgb(var(--color-tertiary))]" />
                Common Project Exclusion Patterns
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter(s => !localExclusions.includes(s))
                  .map((suggestion, index) => (
                    <Badge 
                      key={suggestion} 
                      className="cursor-pointer bg-[rgba(var(--color-bg-secondary),0.5)] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] border border-[rgba(var(--color-border),0.7)] hover:border-[rgba(var(--color-tertiary),0.4)] hover:bg-[rgba(var(--color-tertiary),0.1)] font-mono transition-all duration-200 animate-fade-in"
                      onClick={() => setNewExclusion(suggestion)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {suggestion}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="relative">
          <Separator className="bg-[rgba(var(--color-border),0.5)]" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 px-2 bg-[rgb(var(--color-bg-tertiary))]">
            <Filter size={14} className="text-[rgb(var(--color-text-muted))]" />
          </div>
        </div>

        {/* Exclusions List */}
        <div className="border border-[rgba(var(--color-border),0.3)] rounded-xl overflow-hidden glass">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(var(--color-border),0.2)] glass-header">
            <div className="flex items-center text-sm text-[rgb(var(--color-text-secondary))]">
              <Filter size={14} className="mr-2 text-[rgb(var(--color-tertiary))]" />
              Current Project Exclusions
            </div>
            <Badge className="bg-transparent text-[rgb(var(--color-text-muted))] border-[rgba(var(--color-border),0.5)]">
              {localExclusions.length}
            </Badge>
          </div>

          <ScrollArea className="h-[200px]">
            {isLoadingLocal ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-[rgb(var(--color-text-muted))]">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-[rgba(var(--color-tertiary),0.3)] border-t-[rgb(var(--color-tertiary))] animate-spin"></div>
                  <FileX size={16} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[rgb(var(--color-accent-2))]" />
                </div>
                <p className="mt-4 text-sm">Loading exclusions...</p>
              </div>
            ) : localExclusions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-[rgb(var(--color-text-muted))]">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[rgba(var(--color-border),0.1)] mb-4">
                  <Sparkles size={24} className="text-[rgb(var(--color-text-muted))]" />
                </div>
                <p className="text-lg font-medium">No project exclusions yet</p>
                <p className="text-sm mt-1 max-w-xs text-center opacity-80">
                  Add patterns to exclude files from this project only
                </p>
              </div>
            ) : (
              <ul className="p-2 space-y-1">
                {localExclusions.map((exclusion, index) => (
                  <li
                    key={`${exclusion}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--color-bg-secondary),0.3)] border border-[rgba(var(--color-border),0.2)] hover:bg-[rgba(var(--color-bg-secondary),0.5)] transition-all group"
                  >
                    <span className="font-mono text-sm text-[rgb(var(--color-text-primary))]">{exclusion}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-[rgba(var(--color-error),0.1)] text-[rgb(var(--color-error))] hover:bg-[rgba(var(--color-error),0.2)] opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => rmEntry(exclusion)}
                            disabled={isSavingLocal}
                          >
                            <X size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="glass py-1 px-2 shadow-lg">
                          <p className="text-xs">Remove exclusion</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
        
        {/* Info text */}
        <div className="text-xs text-[rgb(var(--color-text-muted))] p-4 bg-[rgba(var(--color-tertiary),0.05)] rounded-lg border border-[rgba(var(--color-tertiary),0.1)]">
          <div className="flex items-center gap-2 mb-2 text-[rgb(var(--color-tertiary))]">
            <Info size={14} />
            <span className="font-medium">About project exclusions:</span>
          </div>
          <p className="mb-2">These patterns will be excluded when using &ldquo;Select All&rdquo; in this project only.</p>
          <p>Use patterns like <code className="bg-[rgba(var(--color-bg-secondary),0.7)] px-2 py-0.5 rounded text-[rgb(var(--color-accent-1))] font-mono">*.test.js</code> or specific file paths.</p>
        </div>
      </GlassPanel>
    );
};

export default RefinedLocalExclusionsManagerView;
