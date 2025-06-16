// FILE: views/ExclusionsManagerView.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Pencil, Save, Plus, X, AlertTriangle, FolderMinus, 
  Loader2, FileX, Filter, Settings, Check 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useExclusionStore } from '@/stores/useExclusionStore';
import { useExclusionService } from '@/services/exclusionServiceHooks';

const ExclusionsManagerView: React.FC = () => {
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
  const [hovered, setHovered] = useState<string | null>(null);

  // Load global exclusions on mount
  useEffect(() => {
    fetchGlobalExclusions();
  }, [fetchGlobalExclusions]);

  // Sync local edit state when editing starts or global state changes
  useEffect(() => {
    if (isEditing) {
      setLocalExclusionsEdit([...globalExclusions]); // Create a copy for editing
    } else {
      // If not editing, ensure local state matches store (though UI won't show it)
      setLocalExclusionsEdit([...globalExclusions]);
    }
  }, [globalExclusions, isEditing]);

  const handleAdd = () => {
    if (!newExclusion.trim()) return;
    const trimmed = newExclusion.trim();
    // Prevent duplicates in the editing list
    if (!localExclusionsEdit.includes(trimmed)) {
      setLocalExclusionsEdit(prev => [...prev, trimmed]);
    }
    setNewExclusion('');
  };

  const handleRemove = (exclusion: string) => {
    setLocalExclusionsEdit(prev => prev.filter(e => e !== exclusion));
  };

  const handleSave = async () => {
    const success = await updateGlobalExclusions(localExclusionsEdit);
    if (success) {
      setIsEditing(false); // Exit edit mode only on successful save
    }
    // isSavingGlobal state is managed by the hook/store
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewExclusion(''); // Reset input
    setLocalExclusionsEdit([...globalExclusions]); // Revert changes
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  // Common exclusion suggestions
  const suggestions = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.DS_Store', '__pycache__', 'venv', '*.log', '*.tmp'];
  const currentList = isEditing ? localExclusionsEdit : globalExclusions;

  return (
    <Card className="glass animate-fade-in">
      <div className="flex flex-col space-y-4 p-5">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(var(--color-error),0.1)] border border-[rgba(var(--color-error),0.2)]">
              <FolderMinus size={20} className="text-[rgb(var(--color-error))]" />
            </div>
            <div>
              <Label className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-error))] to-[rgb(var(--color-accent-1))]">
                Global Exclusions
              </Label>
              <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
                Path patterns excluded from all projects
              </p>
            </div>
            
            {/* Count badge */}
            {globalExclusions.length > 0 && !isEditing && (
              <Badge className="ml-auto bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] border border-[rgba(255,85,85,0.3)]">
                {globalExclusions.length}
              </Badge>
            )}
            {isEditing && (
              <Badge className="ml-auto bg-[rgba(255,184,108,0.1)] text-[rgb(255,184,108)] border border-[rgba(255,184,108,0.3)] animate-pulse">
                {localExclusionsEdit.length} (editing)
              </Badge>
            )}
          </div>
          
          {/* Edit/Save Controls */}
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSavingGlobal}
                className="border-[rgba(60,63,87,0.7)] bg-[rgba(15,16,36,0.4)] text-[rgb(140,143,170)] hover:text-[rgb(224,226,240)] hover:bg-[rgba(60,63,87,0.2)]"
              >
                Cancel
              </Button>
            )}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                    disabled={isSavingGlobal || isLoadingGlobal}
                    className={isEditing
                      ? "bg-gradient-to-r from-[rgb(80,250,123)] to-[rgb(80,250,123)] hover:from-[rgb(80,250,123)] hover:to-[rgb(139,233,253)] text-[rgb(15,16,36)] font-medium shadow-[0_2px_10px_rgba(80,250,123,0.25)]"
                      : "border-[rgba(255,85,85,0.4)] bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] hover:bg-[rgba(255,85,85,0.2)] hover:text-[rgb(255,85,85)] hover:border-[rgba(255,85,85,0.5)]"
                    }
                  >
                    {isSavingGlobal ? (
                      <Loader2 size={16} className="mr-1.5 animate-spin" />
                    ) : isEditing ? (
                      <Save size={16} className="mr-1.5" />
                    ) : (
                      <Pencil size={16} className="mr-1.5" />
                    )}
                    {isSavingGlobal ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit List'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                  <p>{isLoadingGlobal ? "Loading exclusions..." : isEditing ? "Save your changes" : "Edit the exclusion list"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Separator with icon */}
        <div className="relative">
          <Separator className="bg-[rgba(60,63,87,0.5)]" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 px-2 bg-[rgba(30,31,61,0.7)]">
            <FileX size={14} className="text-[rgb(140,143,170)]" />
          </div>
        </div>

        {/* Display Area with enhanced styling */}
        <div className={`relative border rounded-xl overflow-hidden ${
          isEditing 
            ? 'border-[rgba(255,184,108,0.3)] bg-[rgba(15,16,36,0.3)]' 
            : 'border-[rgba(60,63,87,0.7)] bg-[rgba(15,16,36,0.2)]'
          } backdrop-blur-sm`}
        >
          {/* Glow effect when editing */}
          {isEditing && (
            <div className="absolute inset-0 bg-[rgba(255,184,108,0.03)] animate-pulse pointer-events-none"></div>
          )}
          
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(60,63,87,0.5)] bg-[rgba(15,16,36,0.3)]">
            <div className="flex items-center text-xs text-[rgb(140,143,170)]">
              <Filter size={12} className="mr-1.5" />
              {isEditing ? "Edit Exclusions" : "Exclusion Patterns"}
            </div>
            {currentList.length > 0 && (
              <Badge className="bg-transparent text-[rgb(140,143,170)] border-[rgba(60,63,87,0.5)]">
                {currentList.length}
              </Badge>
            )}
          </div>
          
          <ScrollArea className="h-[180px]">
            {isLoadingGlobal && currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-[rgb(140,143,170)]">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-[rgb(123,147,253)] animate-spin"></div>
                  <div className="w-10 h-10 rounded-full border-l-2 border-r-2 border-[rgb(255,85,85)] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  <FileX size={14} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[rgb(224,226,240)]" />
                </div>
                <p className="mt-4 text-sm">Loading exclusions...</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-[rgb(140,143,170)]">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[rgba(60,63,87,0.2)] mb-3">
                  <AlertTriangle size={24} className="opacity-60" />
                </div>
                <p className="text-center italic max-w-xs">
                  No global exclusions defined.
                  {isEditing && (
                    <span className="block mt-1">Add directories (e.g. node_modules) or patterns (e.g. *.log).</span>
                  )}
                </p>
              </div>
            ) : isEditing ? (
              // --- Editing View ---
              <ul className="p-3 space-y-2">
                {localExclusionsEdit.map((exclusion, index) => (
                  <li
                    key={exclusion}
                    className={`flex justify-between items-center rounded-lg border px-3 py-2 transition-colors duration-150 animate-fade-in ${
                      hovered === exclusion
                        ? 'bg-[rgba(255,85,85,0.05)] border-[rgba(255,85,85,0.3)]'
                        : 'bg-[rgba(15,16,36,0.4)] border-[rgba(60,63,87,0.5)]'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onMouseEnter={() => setHovered(exclusion)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="flex items-center">
                      <FileX size={14} className={`mr-2 ${
                        hovered === exclusion ? 'text-[rgb(255,85,85)]' : 'text-[rgb(140,143,170)]'
                      }`} />
                      <span className="font-mono text-sm text-[rgb(224,226,240)]">{exclusion}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(exclusion)}
                      className="h-7 w-7 rounded-full bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] hover:bg-[rgba(255,85,85,0.2)] hover:text-[rgb(255,85,85)]"
                    >
                      <X size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              // --- Read-only View ---
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {globalExclusions.map((exclusion, index) => (
                    <Badge 
                      key={exclusion} 
                      className="bg-[rgba(15,16,36,0.4)] text-[rgb(224,226,240)] border border-[rgba(60,63,87,0.7)] py-1 px-2.5 font-mono text-xs hover:bg-[rgba(255,85,85,0.1)] hover:border-[rgba(255,85,85,0.3)] transition-colors cursor-default"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <FileX size={12} className="mr-1.5 text-[rgb(255,85,85)]" />
                      {exclusion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Editing Controls */}
        {isEditing && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="relative flex-grow">
                <Input
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  placeholder="Add directory (e.g. node_modules) or pattern (e.g. *.log)"
                  className="h-10 pl-9 pr-8 bg-[rgba(15,16,36,0.5)] border-[rgba(60,63,87,0.7)] focus:ring-1 focus:ring-[rgb(255,85,85)] focus:border-transparent text-[rgb(224,226,240)]"
                  onKeyDown={handleKeyDown}
                  disabled={isSavingGlobal}
                />
                <FileX className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(140,143,170)]" />
                {newExclusion && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-[rgb(140,143,170)] hover:text-[rgb(224,226,240)]"
                    onClick={() => setNewExclusion('')}
                    disabled={isSavingGlobal}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="default"
                      onClick={handleAdd}
                      disabled={isSavingGlobal || !newExclusion.trim()}
                      className="h-10 bg-[rgba(255,85,85,0.9)] hover:bg-[rgb(255,85,85)] text-white"
                    >
                      <Plus size={16} className="mr-1.5" /> Add
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                    <p>Add this pattern to exclusions list</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Quick suggestions */}
            {!newExclusion && (
              <div className="border rounded-lg p-3 bg-[rgba(15,16,36,0.3)] border-[rgba(60,63,87,0.5)]">
                <div className="flex items-center mb-2 text-xs text-[rgb(190,192,210)]">
                  <Settings size={12} className="mr-1.5 text-[rgb(123,147,253)]" />
                  Common Exclusion Patterns
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions
                    .filter(s => !localExclusionsEdit.includes(s))
                    .map((suggestion, index) => (
                      <Badge 
                        key={suggestion} 
                        className="cursor-pointer bg-[rgba(15,16,36,0.4)] text-[rgb(190,192,210)] hover:text-[rgb(224,226,240)] border border-[rgba(60,63,87,0.7)] hover:border-[rgba(255,85,85,0.4)] hover:bg-[rgba(255,85,85,0.1)] font-mono transition-all duration-150"
                        onClick={() => setNewExclusion(suggestion)}
                        style={{ animationDelay: `${index * 30}ms` }}
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
        <div className="text-xs text-[rgb(140,143,170)] p-3 bg-[rgba(123,147,253,0.05)] rounded-lg border border-[rgba(123,147,253,0.1)] mt-2">
          <div className="flex items-center gap-1.5 mb-1 text-[rgb(123,147,253)]">
            <Check size={12} className="text-[rgb(123,147,253)]" />
            <span className="font-medium">How exclusions work:</span>
          </div>
          These patterns (relative to project root) will be excluded from all projects.
          <span className="block mt-1">Configuration is saved in <code className="bg-[rgba(15,16,36,0.5)] px-1.5 py-0.5 rounded text-[rgb(255,121,198)]">ignoreDirs.txt</code></span>
        </div>
      </div>
    </Card>
  );
};

export default ExclusionsManagerView;