// FILE: views/InstructionsInputView.tsx
// FULL FILE - Added Refine Prompt Button and Logic
// UPDATED: Send file tree context to refine prompt
import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, FileText, Download, Edit3, XCircle, Loader2, Undo, Redo, Sparkles } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

// Import Stores and Service Hook
import { usePromptStore } from '@/stores/usePromptStore';
import { useProjectStore } from '@/stores/useProjectStore'; 
import { useExclusionStore } from '@/stores/useExclusionStore'; 
import { usePromptService } from '@/services/promptServiceHooks';
import { useUndoRedo } from '@/lib/hooks/useUndoRedo';
import { generateTextualTree } from '@/lib/treeUtils'; 

const MAX_CHARS = 1000;

const InstructionsInputView: React.FC = () => {
  // Get state from Zustand stores
  const metaPrompt = usePromptStore(s => s.metaPrompt);
  const setMetaPrompt = usePromptStore(s => s.setMetaPrompt);
  const mainInstructionsFromStore = usePromptStore(s => s.mainInstructions); // Renamed for clarity with useUndoRedo
  const setMainInstructionsInStore = usePromptStore(s => s.setMainInstructions); // Renamed for clarity
  const metaPromptFiles = usePromptStore(s => s.metaPromptFiles);
  const selectedMetaFile = usePromptStore(s => s.selectedMetaFile);
  const setSelectedMetaFile = usePromptStore(s => s.setSelectedMetaFile);
  const newMetaFileName = usePromptStore(s => s.newMetaFileName);
  const setNewMetaFileName = usePromptStore(s => s.setNewMetaFileName);
  const isLoadingMetaList = usePromptStore(s => s.isLoadingMetaList);
  const isLoadingMetaContent = usePromptStore(s => s.isLoadingMetaContent);
  const isSavingMeta = usePromptStore(s => s.isSavingMeta);

  const fileTree = useProjectStore(s => s.fileTree); 
  const globalExclusions = useExclusionStore(s => s.globalExclusions); 
  const extensionFilters = useExclusionStore(s => s.extensionFilters); 

  // Get actions from service hook
  const { fetchMetaPromptList, loadMetaPrompt, saveMetaPrompt, useRefinePrompt } = usePromptService();
  const { refinePrompt, isRefining } = useRefinePrompt();

  // Undo/Redo Hook for Main Instructions
  const {
    currentValue: currentMainInstructions,
    updateCurrentValue: updateMainInstructionsValue,
    undo: undoMainInstructions,
    redo: redoMainInstructions,
    canUndo: canUndoMain,
    canRedo: canRedoMain,
  } = useUndoRedo(mainInstructionsFromStore, setMainInstructionsInStore, { debounceMs: 0 });

  // Calculate character counts and percentages
  const metaCount = metaPrompt.length;
  const mainCount = currentMainInstructions.length;
  const metaPercentage = Math.min(100, (metaCount / MAX_CHARS) * 100);
  const mainPercentage = Math.min(100, (mainCount / MAX_CHARS) * 100);

  const getProgressColor = (count: number) => {
    if (count > MAX_CHARS) return "bg-rose-500";
    if (count > MAX_CHARS * 0.9) return "bg-amber-500";
    return "bg-indigo-500";
  };

  const getCounterColor = (count: number) => {
    if (count > MAX_CHARS) return "text-rose-500 dark:text-rose-400";
    if (count > MAX_CHARS * 0.9) return "text-amber-500 dark:text-amber-400";
    return "text-gray-500 dark:text-gray-400";
  };

  function clearMetaPrompt() {
    setMetaPrompt('');
  }

  function clearMainInstructions() {
    updateMainInstructionsValue('');
  }

  const handleSelectChange = (value: string) => {
      setSelectedMetaFile(value === "none" ? "" : value);
  };

  const handleMainInstructionsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    const isUndo = modKey && e.key === 'z' && !e.shiftKey;
    const isRedo = modKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey));

    if (isUndo) {
      e.preventDefault();
      undoMainInstructions();
    } else if (isRedo) {
      e.preventDefault();
      redoMainInstructions();
    }
  };

  // Refine Prompt Handler - UPDATED
  const handleRefinePrompt = async () => {
    if (!currentMainInstructions.trim() || isRefining) return;

    // Generate the textual tree representation
    const treeText = generateTextualTree(
      fileTree,
      globalExclusions,
      extensionFilters // Pass extension filters as well
    );

    // Call refinePrompt with both text and tree context
    const refinedText = await refinePrompt(currentMainInstructions, treeText);

    if (refinedText !== null) {
      updateMainInstructionsValue(refinedText);
    }
  };

  useEffect(() => {
    if (selectedMetaFile) {
      loadMetaPrompt();
    }
  }, [selectedMetaFile, loadMetaPrompt]);

  useEffect(() => {
    fetchMetaPromptList();
  }, [fetchMetaPromptList]);


  return (
    <div className="space-y-5">
      {/* Section Title */}
      <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400 flex items-center">
        <Edit3 className="mr-2 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        Prompts
      </h3>

      {/* Meta Prompt Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Load Saved Prompt
        </Label>
        <div className="flex gap-2">
          <Select
            value={selectedMetaFile || "none"}
            onValueChange={handleSelectChange}
            disabled={isLoadingMetaList || isLoadingMetaContent}
          >
            <SelectTrigger className="flex-grow bg-white dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-70">
              <SelectValue placeholder="Select a saved prompt..." />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
              <SelectItem value="none">-- None --</SelectItem>
              {metaPromptFiles.length === 0 && !isLoadingMetaList && (
                  <div className="px-2 py-1 text-xs text-gray-500 italic">No prompts saved yet.</div>
              )}
              {metaPromptFiles.map(file => (
                <SelectItem key={file} value={file} className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={fetchMetaPromptList} variant="outline" size="icon"
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950 w-9 h-9 flex-shrink-0"
                  disabled={isLoadingMetaList}
                 >
                   {isLoadingMetaList ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                 </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Refresh list of saved prompts</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Save meta prompt */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Save Current Prompt As
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              value={newMetaFileName}
              onChange={e => setNewMetaFileName(e.target.value)}
              placeholder={selectedMetaFile || "new_prompt_name.txt"}
              className="pl-9 h-9 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-transparent text-sm"
              disabled={isSavingMeta}
            />
          </div>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                 <Button
                  onClick={saveMetaPrompt}
                  className="bg-teal-500 hover:bg-teal-600 text-white w-[80px]"
                  disabled={!metaPrompt.trim() || isSavingMeta || isLoadingMetaContent}
                 >
                   {isSavingMeta ? <Loader2 size={16} className="animate-spin" /> : <><Save className="mr-1 h-4 w-4" /> Save</>}
                 </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Save the current prompt content to a file</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Meta Prompt Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="meta-prompt-area" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Meta Prompt:
          </Label>
          <span className={`text-xs font-mono ${getCounterColor(metaCount)}`}>
            {metaCount} / {MAX_CHARS}
          </span>
        </div>
        <Textarea
          id="meta-prompt-area"
          value={metaPrompt}
          onChange={e => setMetaPrompt(e.target.value)}
          className="min-h-[80px] bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
          placeholder="Enter meta prompt instructions (e.g., persona, response format)..."
          disabled={isLoadingMetaContent || isSavingMeta}
        />
        <Progress value={metaPercentage} className={`h-1 ${getProgressColor(metaCount)}`} />
        {metaPrompt && (
          <div className="flex justify-end -mt-1">
            <Button variant="ghost" size="sm" className="text-xs h-7 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/50" onClick={clearMetaPrompt} disabled={isLoadingMetaContent || isSavingMeta}>
              <XCircle className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        )}
      </div>

      {/* Main Instructions */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="main-instructions-area" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Main Instructions:
          </Label>
          <div className="flex items-center gap-1">
             {/* Refine Button */}
             <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200 disabled:opacity-50"
                      onClick={handleRefinePrompt}
                      disabled={!currentMainInstructions.trim() || isRefining || isLoadingMetaContent || isSavingMeta || fileTree.length === 0} // Disable if no tree
                    >
                      {isRefining ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Refine prompt with AI (uses file tree context)</p></TooltipContent>
                </Tooltip>
             </TooltipProvider>
             {/* Undo Button */}
             <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50" onClick={undoMainInstructions} disabled={!canUndoMain}>
                      <Undo size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Undo (Ctrl+Z)</p></TooltipContent>
                </Tooltip>
             </TooltipProvider>
             {/* Redo Button */}
             <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50" onClick={redoMainInstructions} disabled={!canRedoMain}>
                      <Redo size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Redo (Ctrl+Y)</p></TooltipContent>
                </Tooltip>
             </TooltipProvider>
             {/* Character Count */}
             <span className={`text-xs font-mono ${getCounterColor(mainCount)} ml-2`}>
                {mainCount} / {MAX_CHARS}
             </span>
          </div>
        </div>
        <Textarea
          id="main-instructions-area"
          value={currentMainInstructions}
          onChange={e => updateMainInstructionsValue(e.target.value)}
          onKeyDown={handleMainInstructionsKeyDown}
          className="min-h-[120px] bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-indigo-500 focus:border-transparent resize-y text-sm"
          placeholder="Enter your main instructions for the task..."
           disabled={isLoadingMetaContent || isSavingMeta || isRefining}
        />
        <Progress value={mainPercentage} className={`h-1 ${getProgressColor(mainCount)}`} />
         {currentMainInstructions && (
          <div className="flex justify-end -mt-1">
            <Button variant="ghost" size="sm" className="text-xs h-7 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-900/50" onClick={clearMainInstructions} disabled={isLoadingMetaContent || isSavingMeta || isRefining}>
              <XCircle className="mr-1 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructionsInputView;
