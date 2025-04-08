// File: views/ExclusionsManagerView.tsx
// REFACTOR / OVERWRITE
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card'; // Removed unused Card components
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Save, Plus, X, AlertTriangle, FolderMinus, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import Store and Service Hook
import { useExclusionStore } from '@/stores/useExclusionStore';
import { useExclusionService } from '@/services/exclusionServiceHooks';

// No props needed anymore
// interface ExclusionsManagerProps {
//   excludedPaths: string[]
//   onUpdateExclusions: (paths: string[]) => Promise<void>
// }

const ExclusionsManagerView: React.FC = () => {
  // Get state from Zustand store
  const { globalExclusions, isLoadingGlobal, isSavingGlobal } = useExclusionStore();
  // Get actions from service hook
  const { fetchGlobalExclusions, updateGlobalExclusions } = useExclusionService();

  // Local state for editing UI
  const [localExclusionsEdit, setLocalExclusionsEdit] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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
  const suggestions = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.DS_Store', '__pycache__', 'venv'];

  const currentList = isEditing ? localExclusionsEdit : globalExclusions;

  return (
    <Card className="p-4 space-y-2 bg-white dark:bg-gray-900/70 border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderMinus size={18} className="text-rose-500 dark:text-rose-400" />
          <Label className="text-base font-medium text-gray-800 dark:text-gray-200">Global Exclusions</Label>
          {/* Display count based on the actual store state */}
          {globalExclusions.length > 0 && !isEditing && (
            <Badge variant="outline" className="ml-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
              {globalExclusions.length}
            </Badge>
          )}
           {/* Display count based on the editing state */}
           {isEditing && (
             <Badge variant="outline" className="ml-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
               {localExclusionsEdit.length} (editing)
             </Badge>
           )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSavingGlobal}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
                  disabled={isSavingGlobal || isLoadingGlobal} // Disable if loading or saving
                  className={`w-[120px] ${isEditing
                    ? "bg-teal-500 hover:bg-teal-600 text-white"
                    : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  }`}
                >
                  {isSavingGlobal ? (
                     <Loader2 size={16} className="mr-1 animate-spin" />
                  ) : isEditing ? (
                    <Save size={16} className="mr-1" />
                  ) : (
                    <Pencil size={16} className="mr-1" />
                  )}
                  {isSavingGlobal ? 'Saving...' : isEditing ? 'Save' : 'Edit List'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isLoadingGlobal ? "Loading exclusions..." : isEditing ? "Save your changes" : "Edit the exclusion list"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Display Area */}
      <ScrollArea className={`h-32 border rounded-md p-1 ${isEditing ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800/50'} border-gray-200 dark:border-gray-700`}>
        {isLoadingGlobal && currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-3 text-gray-500 dark:text-gray-400">
               <Loader2 size={20} className="animate-spin mb-1 opacity-50" />
                <p className="text-xs">Loading...</p>
             </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-3 text-gray-500 dark:text-gray-400">
             <AlertTriangle size={20} className="mb-1 opacity-50" />
            <p className="text-xs text-center italic">
              No global exclusions defined.
              {isEditing && <><br />Add directories like 'node_modules' or '.git'.</>}
            </p>
          </div>
        ) : isEditing ? (
            // --- Editing View ---
             <ul className="space-y-1 p-1">
                {localExclusionsEdit.map((exclusion) => (
                  <li
                    key={exclusion}
                    className="flex justify-between items-center bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 px-2 py-1 text-sm text-gray-700 dark:text-gray-300 group"
                  >
                    <span className="font-mono text-xs">{exclusion}</span>
                    <Button
                      variant="ghost" size="sm" onClick={() => handleRemove(exclusion)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-50 group-hover:opacity-100"
                    > <X size={14} /> </Button>
                  </li>
                ))}
              </ul>
        ) : (
            // --- Read-only View ---
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
                {globalExclusions.map(exclusion => (
                  <Badge key={exclusion} variant="outline"
                    className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 py-0.5 px-2 font-mono text-xs"
                  > {exclusion} </Badge>
                ))}
              </div>
            </div>
        )}
      </ScrollArea>

       {/* Editing Controls (only shown when editing) */}
        {isEditing && (
           <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                    <Input
                        value={newExclusion}
                        onChange={(e) => setNewExclusion(e.target.value)}
                        placeholder="Add directory or pattern (e.g. node_modules, *.log)"
                        className="h-9 pr-8 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
                        onKeyDown={handleKeyDown}
                        disabled={isSavingGlobal}
                    />
                    {newExclusion && (
                        <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={() => setNewExclusion('')} disabled={isSavingGlobal}>
                           <X size={14} />
                        </Button>
                    )}
                    </div>
                    <Button variant="default" size="sm" onClick={handleAdd} disabled={isSavingGlobal || !newExclusion.trim()} className="h-9 bg-indigo-500 hover:bg-indigo-600 text-white">
                        <Plus size={16} className="mr-1" /> Add
                    </Button>
                </div>

                 {/* Suggestions only if input is empty */}
                {!newExclusion && (
                    <div className="flex flex-wrap gap-1 text-xs pt-1">
                       <span className="text-gray-500 dark:text-gray-400 mr-1">Suggest:</span>
                        {suggestions
                            .filter(s => !localExclusionsEdit.includes(s)) // Don't suggest if already added
                            .map(suggestion => (
                                <Badge key={suggestion} variant="outline"
                                className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors font-normal"
                                onClick={() => setNewExclusion(suggestion)}>
                                {suggestion}
                                </Badge>
                        ))}
                    </div>
                )}
            </div>
        )}

      <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
        These paths (relative to project root) will be excluded globally. Saved in <code>ignoreDirs.txt</code>.
      </div>
    </Card>
  );
};

export default ExclusionsManagerView;