// FILE: views/RefinedExclusionsManagerView.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Pencil, Save, Plus, X, FolderMinus, 
  Loader2, FileX, Settings, Check, Info, Sparkles, Filter 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useExclusionStore } from '@/stores/useExclusionStore';
import { useExclusionService } from '@/services/exclusionServiceHooks';

const RefinedExclusionsManagerView: React.FC = () => {
  // Get state from Zustand store
  const globalExclusions = useExclusionStore(s => s.globalExclusions);
  const isLoadingGlobal = useExclusionStore(s => s.isLoadingGlobal);
  const isSavingGlobal = useExclusionStore(s => s.isSavingGlobal);
  
  // Get actions from service hook
  const { fetchGlobalExclusions, updateGlobalExclusions } = useExclusionService();

  // Local state for editing UI
  const [localExclusionsEdit, setLocalExclusionsEdit] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Common exclusion patterns
  const suggestions = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '*.log',
    '.env*',
    'coverage',
    '.next',
    '.nuxt',
    'vendor',
    '__pycache__',
    '*.pyc',
    '.DS_Store',
    'Thumbs.db'
  ];

  // Initialize local edit state when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setLocalExclusionsEdit([...globalExclusions]);
    }
  }, [isEditing, globalExclusions]);

  // Load exclusions on mount
  useEffect(() => {
    fetchGlobalExclusions();
  }, [fetchGlobalExclusions]);

  const handleSave = async () => {
    try {
      await updateGlobalExclusions(localExclusionsEdit);
      setIsEditing(false);
      setNewExclusion('');
    } catch (error) {
      console.error('Failed to save exclusions:', error);
    }
  };

  const handleCancel = () => {
    setLocalExclusionsEdit([...globalExclusions]);
    setIsEditing(false);
    setNewExclusion('');
  };

  const addExclusion = () => {
    if (newExclusion.trim() && !localExclusionsEdit.includes(newExclusion.trim())) {
      setLocalExclusionsEdit([...localExclusionsEdit, newExclusion.trim()]);
      setNewExclusion('');
    }
  };

  const removeExclusion = (exclusion: string) => {
    setLocalExclusionsEdit(localExclusionsEdit.filter(e => e !== exclusion));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addExclusion();
    }
  };

  return (
    <Card className="glass animate-fade-in">
      <CardHeader className="glass-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 rounded-xl bg-[rgba(var(--color-error),0.1)] border border-[rgba(var(--color-error),0.2)]">
              <FolderMinus size={20} className="text-[rgb(var(--color-error))]" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-error))] to-[rgb(var(--color-accent-1))]">
                Global Exclusions
              </CardTitle>
              <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
                Patterns excluded from all projects
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {globalExclusions.length > 0 && (
              <Badge className="bg-[rgba(var(--color-error),0.1)] text-[rgb(var(--color-error))] border border-[rgba(var(--color-error),0.3)]">
                {isEditing ? localExclusionsEdit.length : globalExclusions.length} patterns
              </Badge>
            )}
            {isLoadingGlobal && (
              <Badge className="bg-[rgba(var(--color-info),0.1)] text-[rgb(var(--color-info))] border border-[rgba(var(--color-info),0.3)]">
                <Loader2 size={12} className="animate-spin mr-1.5" />
                Loading...
              </Badge>
            )}
            {isSavingGlobal && (
              <Badge className="bg-[rgba(var(--color-warning),0.1)] text-[rgb(var(--color-warning))] border border-[rgba(var(--color-warning),0.3)] animate-pulse">
                <Loader2 size={12} className="animate-spin mr-1.5" />
                Saving...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Edit Controls */}
        {!isEditing ? (
          <div className="flex justify-between items-center">
            <div className="text-sm text-[rgb(var(--color-text-secondary))]">
              Click edit to modify global exclusions
            </div>
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              variant="outline"
              className="border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-secondary),0.5)] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgba(var(--color-primary),0.1)] hover:border-[rgba(var(--color-primary),0.3)] transition-all"
            >
              <Pencil size={14} className="mr-1.5" />
              Edit
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="text-sm text-[rgb(var(--color-text-secondary))]">
              Editing global exclusions
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleCancel}
                size="sm"
                variant="outline"
                className="border-[rgba(var(--color-border),0.7)] bg-transparent text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgba(var(--color-border),0.1)]"
              >
                Cancel
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      disabled={isSavingGlobal}
                      className="bg-[rgb(var(--color-error))] hover:bg-[rgba(var(--color-error),0.9)] text-white shadow-[0_4px_12px_rgba(var(--color-error),0.3)]"
                    >
                      {isSavingGlobal ? (
                        <Loader2 size={14} className="animate-spin mr-1.5" />
                      ) : (
                        <Save size={14} className="mr-1.5" />
                      )}
                      Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="glass py-2 px-3 shadow-lg border-[rgba(var(--color-border),0.2)]">
                    <p className="text-xs">Save changes to global exclusions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="relative">
          <Separator className="bg-[rgba(var(--color-border),0.5)]" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 px-2 bg-[rgb(var(--color-bg-tertiary))]">
            <FileX size={14} className="text-[rgb(var(--color-text-muted))]" />
          </div>
        </div>

        {/* Exclusions List */}
        <div className="border border-[rgba(var(--color-border),0.3)] rounded-xl overflow-hidden glass">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(var(--color-border),0.2)] glass-header">
            <div className="flex items-center text-sm text-[rgb(var(--color-text-secondary))]">
              <Filter size={14} className="mr-2 text-[rgb(var(--color-primary))]" />
              Current Exclusions
            </div>
            <Badge className="bg-transparent text-[rgb(var(--color-text-muted))] border-[rgba(var(--color-border),0.5)]">
              {isEditing ? localExclusionsEdit.length : globalExclusions.length}
            </Badge>
          </div>

          <ScrollArea className="h-[200px]">
            {isLoadingGlobal ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-[rgb(var(--color-text-muted))]">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-[rgba(var(--color-primary),0.3)] border-t-[rgb(var(--color-primary))] animate-spin"></div>
                  <FileX size={16} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[rgb(var(--color-accent-2))]" />
                </div>
                <p className="mt-4 text-sm">Loading exclusions...</p>
              </div>
            ) : (isEditing ? localExclusionsEdit : globalExclusions).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-[rgb(var(--color-text-muted))]">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[rgba(var(--color-border),0.1)] mb-4">
                  <Sparkles size={24} className="text-[rgb(var(--color-text-muted))]" />
                </div>
                <p className="text-lg font-medium">No exclusions yet</p>
                <p className="text-sm mt-1 max-w-xs text-center opacity-80">
                  Add patterns to exclude files and folders from all projects
                </p>
              </div>
            ) : (
              <ul className="p-2 space-y-1">
                {(isEditing ? localExclusionsEdit : globalExclusions).map((exclusion, index) => (
                  <li
                    key={`${exclusion}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-[rgba(var(--color-bg-secondary),0.3)] border border-[rgba(var(--color-border),0.2)] hover:bg-[rgba(var(--color-bg-secondary),0.5)] transition-all group"
                  >
                    <span className="font-mono text-sm text-[rgb(var(--color-text-primary))]">{exclusion}</span>
                    {isEditing && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full bg-[rgba(var(--color-error),0.1)] text-[rgb(var(--color-error))] hover:bg-[rgba(var(--color-error),0.2)] opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => removeExclusion(exclusion)}
                            >
                              <X size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="glass py-1 px-2 shadow-lg">
                            <p className="text-xs">Remove exclusion</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Add New Exclusion */}
        {isEditing && (
          <div className="space-y-4">
            <div className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center">
              <Plus size={14} className="mr-2 text-[rgb(var(--color-primary))]" />
              Add new exclusion pattern
            </div>
            
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., node_modules, *.log, .env*"
                  className="pl-9 bg-[rgba(var(--color-bg-secondary),0.5)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))] text-[rgb(var(--color-text-primary))]"
                />
                <FileX className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={addExclusion}
                      disabled={!newExclusion.trim() || localExclusionsEdit.includes(newExclusion.trim())}
                      className="bg-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.9)] text-white shadow-[0_4px_12px_rgba(var(--color-primary),0.3)]"
                    >
                      <Plus size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="glass py-2 px-3 shadow-lg">
                    <p className="text-xs">Add pattern to exclusions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Quick suggestions */}
            {!newExclusion && (
              <div className="border rounded-lg p-4 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.3)]">
                <div className="flex items-center mb-3 text-sm text-[rgb(var(--color-text-secondary))]">
                  <Settings size={14} className="mr-2 text-[rgb(var(--color-primary))]" />
                  Common Exclusion Patterns
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions
                    .filter(s => !localExclusionsEdit.includes(s))
                    .map((suggestion, index) => (
                      <Badge 
                        key={suggestion} 
                        className="cursor-pointer bg-[rgba(var(--color-bg-secondary),0.5)] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] border border-[rgba(var(--color-border),0.7)] hover:border-[rgba(var(--color-primary),0.4)] hover:bg-[rgba(var(--color-primary),0.1)] font-mono transition-all duration-200 animate-fade-in"
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
        )}

        {/* Info text */}
        <div className="text-xs text-[rgb(var(--color-text-muted))] p-4 bg-[rgba(var(--color-info),0.05)] rounded-lg border border-[rgba(var(--color-info),0.1)]">
          <div className="flex items-center gap-2 mb-2 text-[rgb(var(--color-info))]">
            <Info size={14} />
            <span className="font-medium">How exclusions work:</span>
          </div>
          <p className="mb-2">These patterns (relative to project root) will be excluded from all projects.</p>
          <p>Configuration is saved in <code className="bg-[rgba(var(--color-bg-secondary),0.7)] px-2 py-0.5 rounded text-[rgb(var(--color-accent-1))] font-mono">ignoreDirs.txt</code></p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefinedExclusionsManagerView;