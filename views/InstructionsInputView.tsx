// FILE: views/InstructionsInputView.tsx
// Enhanced with modern UI design
import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, FileText, Download, Edit3, XCircle, Loader2, Undo, Redo, Sparkles, Wand2, MessageSquare, Brain, Zap } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const mainInstructionsFromStore = usePromptStore(s => s.mainInstructions);
  const setMainInstructionsInStore = usePromptStore(s => s.setMainInstructions);
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
    if (count > MAX_CHARS) return "bg-gradient-to-r from-rose-500 to-rose-600";
    if (count > MAX_CHARS * 0.9) return "bg-gradient-to-r from-amber-500 to-amber-600";
    return "bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))]";
  };

  const getCounterColor = (count: number) => {
    if (count > MAX_CHARS) return "text-rose-500";
    if (count > MAX_CHARS * 0.9) return "text-amber-500";
    return "text-[rgb(var(--color-text-muted))]";
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

  const handleRefinePrompt = async () => {
    if (!currentMainInstructions.trim() || isRefining) return;

    const treeText = generateTextualTree(
      fileTree,
      globalExclusions,
      extensionFilters
    );

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
    <div className="space-y-6">
      {/* Section Title with enhanced styling */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[rgba(var(--color-tertiary),0.2)] to-[rgba(var(--color-tertiary),0.1)] border border-[rgba(var(--color-tertiary),0.3)] shadow-sm">
          <MessageSquare className="h-5 w-5 text-[rgb(var(--color-tertiary))]" />
        </div>
        <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-accent-1))]">
          Prompt Instructions
        </h3>
      </div>

      {/* Enhanced Meta Prompt Selector */}
      <div className="space-y-3 glass rounded-xl p-4 border-[rgba(var(--color-border),0.5)]">
        <Label className="text-sm font-medium text-[rgb(var(--color-text-secondary))] flex items-center gap-2">
          <FileText className="h-4 w-4 text-[rgb(var(--color-accent-2))]" />
          Load Saved Prompt
        </Label>
        <div className="flex gap-2">
          <Select
            value={selectedMetaFile || "none"}
            onValueChange={handleSelectChange}
            disabled={isLoadingMetaList || isLoadingMetaContent}
          >
            <SelectTrigger className="flex-grow h-10 glass border-[rgba(var(--color-border),0.5)] text-[rgb(var(--color-text-primary))] focus:ring-2 focus:ring-[rgba(var(--color-primary),0.5)]">
              <SelectValue placeholder="Select a saved prompt..." />
            </SelectTrigger>
            <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
              <SelectItem value="none">-- None --</SelectItem>
              {metaPromptFiles.length === 0 && !isLoadingMetaList && (
                <div className="px-3 py-2 text-xs text-[rgb(var(--color-text-muted))] italic">No prompts saved yet.</div>
              )}
              {metaPromptFiles.map(file => (
                <SelectItem key={file} value={file} className="font-mono text-xs">
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={fetchMetaPromptList} 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 glass border-[rgba(var(--color-border),0.5)] hover:bg-[rgba(var(--color-primary),0.1)] hover:border-[rgba(var(--color-primary),0.5)]"
                  disabled={isLoadingMetaList}
                >
                  {isLoadingMetaList ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="glass">
                <p>Refresh saved prompts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Enhanced Save prompt section */}
      <div className="space-y-3 glass rounded-xl p-4 border-[rgba(var(--color-border),0.5)]">
        <Label className="text-sm font-medium text-[rgb(var(--color-text-secondary))] flex items-center gap-2">
          <Save className="h-4 w-4 text-[rgb(var(--color-secondary))]" />
          Save Current Prompt As
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))] h-4 w-4" />
            <Input
              type="text"
              value={newMetaFileName}
              onChange={e => setNewMetaFileName(e.target.value)}
              placeholder={selectedMetaFile || "new_prompt_name.txt"}
              className="pl-10 h-10 glass border-[rgba(var(--color-border),0.5)] focus:ring-2 focus:ring-[rgba(var(--color-secondary),0.5)] text-[rgb(var(--color-text-primary))]"
              disabled={isSavingMeta}
            />
          </div>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={saveMetaPrompt}
                  className="h-10 bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgb(var(--color-accent-2))] text-white hover:shadow-glow-secondary active-scale"
                  disabled={!metaPrompt.trim() || isSavingMeta || isLoadingMetaContent}
                >
                  {isSavingMeta ? <Loader2 size={16} className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save</>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="glass">
                <p>Save the current prompt content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Enhanced Meta Prompt Input */}
      <div className="space-y-3 glass rounded-xl p-4 border-[rgba(var(--color-border),0.5)]">
        <div className="flex justify-between items-center">
          <Label htmlFor="meta-prompt-area" className="text-sm font-medium text-[rgb(var(--color-text-secondary))] flex items-center gap-2">
            <Brain className="h-4 w-4 text-[rgb(var(--color-tertiary))]" />
            Meta Prompt
          </Label>
          <Badge className={cn("text-xs", getCounterColor(metaCount))}>
            {metaCount} / {MAX_CHARS}
          </Badge>
        </div>
        <Textarea
          id="meta-prompt-area"
          value={metaPrompt}
          onChange={e => setMetaPrompt(e.target.value)}
          className="min-h-[100px] glass border-[rgba(var(--color-border),0.5)] focus:ring-2 focus:ring-[rgba(var(--color-tertiary),0.5)] resize-y text-sm text-[rgb(var(--color-text-primary))]"
          placeholder="Enter meta prompt instructions (e.g., persona, response format)..."
          disabled={isLoadingMetaContent || isSavingMeta}
        />
        <div className="space-y-2">
          <Progress value={metaPercentage} className={cn("h-1.5 overflow-hidden rounded-full bg-[rgba(var(--color-border),0.3)]")}>
            <div className={cn("h-full transition-all duration-300", getProgressColor(metaCount))} style={{ width: `${metaPercentage}%` }} />
          </Progress>
          {metaPrompt && (
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 text-[rgb(var(--color-error))] hover:bg-[rgba(var(--color-error),0.1)]" 
                onClick={clearMetaPrompt} 
                disabled={isLoadingMetaContent || isSavingMeta}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Main Instructions */}
      <div className="space-y-3 glass rounded-xl p-4 border-[rgba(var(--color-border),0.5)]">
        <div className="flex justify-between items-center">
          <Label htmlFor="main-instructions-area" className="text-sm font-medium text-[rgb(var(--color-text-secondary))] flex items-center gap-2">
            <Zap className="h-4 w-4 text-[rgb(var(--color-accent-3))]" />
            Main Instructions
          </Label>
          <div className="flex items-center gap-2">
            {/* Enhanced Refine Button */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 glass border-[rgba(var(--color-accent-1),0.3)] text-[rgb(var(--color-accent-1))] hover:bg-[rgba(var(--color-accent-1),0.1)] hover:border-[rgba(var(--color-accent-1),0.5)]"
                    onClick={handleRefinePrompt}
                    disabled={!currentMainInstructions.trim() || isRefining || isLoadingMetaContent || isSavingMeta || fileTree.length === 0}
                  >
                    {isRefining ? <Loader2 size={14} className="animate-spin" /> : <><Wand2 size={14} className="mr-1.5" /><Sparkles size={14} /></>}
                    {!isRefining && <span className="ml-1.5">Refine</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass">
                  <p>Refine prompt with AI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1 border-l border-[rgba(var(--color-border),0.3)] pl-2 ml-1">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-30" 
                      onClick={undoMainInstructions} 
                      disabled={!canUndoMain}
                    >
                      <Undo size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="glass"><p>Undo (Ctrl+Z)</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))] disabled:opacity-30" 
                      onClick={redoMainInstructions} 
                      disabled={!canRedoMain}
                    >
                      <Redo size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="glass"><p>Redo (Ctrl+Y)</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Badge className={cn("text-xs ml-2", getCounterColor(mainCount))}>
              {mainCount} / {MAX_CHARS}
            </Badge>
          </div>
        </div>
        
        <Textarea
          id="main-instructions-area"
          value={currentMainInstructions}
          onChange={e => updateMainInstructionsValue(e.target.value)}
          onKeyDown={handleMainInstructionsKeyDown}
          className="min-h-[140px] glass border-[rgba(var(--color-border),0.5)] focus:ring-2 focus:ring-[rgba(var(--color-accent-3),0.5)] resize-y text-sm text-[rgb(var(--color-text-primary))]"
          placeholder="Enter your main instructions for the task..."
          disabled={isLoadingMetaContent || isSavingMeta || isRefining}
        />
        
        <div className="space-y-2">
          <Progress value={mainPercentage} className={cn("h-1.5 overflow-hidden rounded-full bg-[rgba(var(--color-border),0.3)]")}>
            <div className={cn("h-full transition-all duration-300", getProgressColor(mainCount))} style={{ width: `${mainPercentage}%` }} />
          </Progress>
          {currentMainInstructions && (
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 text-[rgb(var(--color-error))] hover:bg-[rgba(var(--color-error),0.1)]" 
                onClick={clearMainInstructions} 
                disabled={isLoadingMetaContent || isSavingMeta || isRefining}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructionsInputView;