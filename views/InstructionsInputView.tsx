import React, { useEffect } from "react";
import {
  Save,
  RefreshCw,
  Loader2,
  Undo,
  Redo,
  Wand2,
  Brain,
  Zap,
  FileText,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { usePromptStore } from "@/stores/usePromptStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useSettingsStore } from "@/stores/useSettingStore";
import { usePromptService } from "@/services/promptServiceHooks";
import { useUndoRedo } from "@/lib/hooks/useUndoRedo";
import { generateTextualTree } from "@/lib/treeUtils";
import { getModelPreset, listModelPresets, type ModelPresetId } from "@/lib/modelPresets";

const MAX_CHARS = 1000;

const counterTone = (count: number) => {
  if (count > MAX_CHARS) return "text-[rgb(var(--color-error))]";
  if (count > MAX_CHARS * 0.9) return "text-[rgb(var(--color-warning))]";
  return "text-[rgb(var(--color-text-muted))]";
};

const percent = (count: number) => Math.min(100, Math.round((count / MAX_CHARS) * 100));

const InstructionsInputView: React.FC = () => {
  const metaPrompt = usePromptStore((state) => state.metaPrompt);
  const setMetaPrompt = usePromptStore((state) => state.setMetaPrompt);
  const mainInstructionsFromStore = usePromptStore((state) => state.mainInstructions);
  const setMainInstructionsInStore = usePromptStore((state) => state.setMainInstructions);
  const metaPromptFiles = usePromptStore((state) => state.metaPromptFiles);
  const selectedMetaFile = usePromptStore((state) => state.selectedMetaFile);
  const setSelectedMetaFile = usePromptStore((state) => state.setSelectedMetaFile);
  const newMetaFileName = usePromptStore((state) => state.newMetaFileName);
  const setNewMetaFileName = usePromptStore((state) => state.setNewMetaFileName);
  const isLoadingMetaList = usePromptStore((state) => state.isLoadingMetaList);
  const isLoadingMetaContent = usePromptStore((state) => state.isLoadingMetaContent);
  const isSavingMeta = usePromptStore((state) => state.isSavingMeta);
  const selectedModelPresetId = useSettingsStore((state) => state.selectedModelPresetId);
  const setSelectedModelPresetId = useSettingsStore((state) => state.setSelectedModelPresetId);

  const fileTree = useProjectStore((state) => state.fileTree);
  const globalExclusions = useExclusionStore((state) => state.globalExclusions);
  const extensionFilters = useExclusionStore((state) => state.extensionFilters);

  const { fetchMetaPromptList, loadMetaPrompt, saveMetaPrompt, refinePrompt, isRefining } =
    usePromptService();

  const {
    currentValue: currentMainInstructions,
    updateCurrentValue: updateMainInstructionsValue,
    undo: undoMainInstructions,
    redo: redoMainInstructions,
    canUndo: canUndoMain,
    canRedo: canRedoMain,
  } = useUndoRedo(mainInstructionsFromStore, setMainInstructionsInStore, { debounceMs: 0 });

  useEffect(() => {
    fetchMetaPromptList();
  }, [fetchMetaPromptList]);

  useEffect(() => {
    if (selectedMetaFile) {
      loadMetaPrompt();
    }
  }, [selectedMetaFile, loadMetaPrompt]);

  const handleRefinePrompt = async () => {
    if (!currentMainInstructions.trim() || isRefining) return;
    const treeText = generateTextualTree(fileTree, globalExclusions, extensionFilters);
    const refinedText = await refinePrompt(currentMainInstructions, treeText);
    if (refinedText !== null) {
      updateMainInstructionsValue(refinedText);
    }
  };

  const handleMainInstructionsKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const modKey = isMac ? event.metaKey : event.ctrlKey;
    const isUndo = modKey && event.key === "z" && !event.shiftKey;
    const isRedo = modKey && (event.key === "y" || (event.key === "z" && event.shiftKey));

    if (isUndo) {
      event.preventDefault();
      undoMainInstructions();
    } else if (isRedo) {
      event.preventDefault();
      redoMainInstructions();
    }
  };

  const metaCount = metaPrompt.length;
  const mainCount = currentMainInstructions.length;
  const isMetaBusy = isLoadingMetaContent || isSavingMeta;
  const selectedPreset = getModelPreset(selectedModelPresetId);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.25)] p-3 text-xs text-[rgb(var(--color-text-muted))]">
        Flow: 1) choose or load template, 2) write meta + main instructions, 3) generate and copy.
      </div>

      <section className="space-y-3 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">1. Prompt Template</h4>
          <Button
            onClick={fetchMetaPromptList}
            variant="outline"
            size="sm"
            className="h-8"
            disabled={isLoadingMetaList}
          >
            {isLoadingMetaList ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <RefreshCw size={14} className="mr-1.5" />}
            Refresh
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <Select
            value={selectedMetaFile || "none"}
            onValueChange={(value) => setSelectedMetaFile(value === "none" ? "" : value)}
            disabled={isLoadingMetaList || isLoadingMetaContent}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select saved prompt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- None --</SelectItem>
              {metaPromptFiles.map((file) => (
                <SelectItem key={file} value={file} className="font-mono text-xs">
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            value={newMetaFileName}
            onChange={(event) => setNewMetaFileName(event.target.value)}
            placeholder={selectedMetaFile || "new_prompt_name.txt"}
            className="h-9"
            disabled={isSavingMeta}
          />

          <Button
            onClick={saveMetaPrompt}
            className="h-9"
            disabled={!metaPrompt.trim() || isSavingMeta || isLoadingMetaContent}
          >
            {isSavingMeta ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
            Save
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <Label className="text-xs text-[rgb(var(--color-text-muted))]">Target model preset</Label>
            <Select
              value={selectedModelPresetId}
              onValueChange={(value) => setSelectedModelPresetId(value as ModelPresetId)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select target model preset" />
              </SelectTrigger>
              <SelectContent>
                {listModelPresets().map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.35)] px-2.5 py-2 text-xs text-[rgb(var(--color-text-muted))]">
            <p className="font-medium text-[rgb(var(--color-text-secondary))]">{selectedPreset.shortDescription}</p>
            <p className="mt-1 font-mono">
              Safe input cap: {selectedPreset.budget.safeInputCapTokens.toLocaleString()} tokens
            </p>
            <p className="font-mono">
              Model ID: {selectedPreset.modelByProvider.google || selectedPreset.modelByProvider.openrouter}
            </p>
            <p className="mt-1 text-[11px]">
              Smart Select + Refine runtime: gemini-3-flash-preview (Google API, fixed)
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="meta-prompt-area" className="inline-flex items-center gap-2 text-sm">
            <Brain size={14} />
            2a. Meta Prompt
          </Label>
          <Badge className={cn("text-xs", counterTone(metaCount))}>
            {metaCount} / {MAX_CHARS}
          </Badge>
        </div>

        <Textarea
          id="meta-prompt-area"
          value={metaPrompt}
          onChange={(event) => setMetaPrompt(event.target.value)}
          className="min-h-[90px] resize-y"
          placeholder="Optional system-level style and constraints..."
          disabled={isMetaBusy}
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[rgb(var(--color-text-muted))]">
            Adds higher-level prompt framing.
          </span>
          {metaPrompt && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setMetaPrompt("")}
              disabled={isMetaBusy}
            >
              <XCircle size={13} className="mr-1.5" />
              Clear
            </Button>
          )}
        </div>
        <Progress value={percent(metaCount)} className="h-1.5" />
      </section>

      <section className="space-y-2 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="main-instructions-area" className="inline-flex items-center gap-2 text-sm">
            <Zap size={14} />
            2b. Main Instructions
          </Label>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleRefinePrompt}
                    disabled={
                      !currentMainInstructions.trim() ||
                      isRefining ||
                      isMetaBusy ||
                      fileTree.length === 0
                    }
                  >
                    {isRefining ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Wand2 size={14} className="mr-1.5" />}
                    Refine
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refine with project-tree context</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undoMainInstructions} disabled={!canUndoMain}>
              <Undo size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redoMainInstructions} disabled={!canRedoMain}>
              <Redo size={14} />
            </Button>
            <Badge className={cn("text-xs", counterTone(mainCount))}>
              {mainCount} / {MAX_CHARS}
            </Badge>
          </div>
        </div>

        <Textarea
          id="main-instructions-area"
          value={currentMainInstructions}
          onChange={(event) => updateMainInstructionsValue(event.target.value)}
          onKeyDown={handleMainInstructionsKeyDown}
          className="min-h-[140px] resize-y"
          placeholder="Describe exactly what the model should produce..."
          disabled={isMetaBusy || isRefining}
        />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-[rgb(var(--color-text-muted))]">
            Undo/Redo: Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Shift+Cmd+Z on Mac).
          </span>
          {currentMainInstructions && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => updateMainInstructionsValue("")}
              disabled={isMetaBusy || isRefining}
            >
              <XCircle size={13} className="mr-1.5" />
              Clear
            </Button>
          )}
        </div>
        <Progress value={percent(mainCount)} className="h-1.5" />
      </section>

      {!metaPromptFiles.length && !isLoadingMetaList && (
        <div className="rounded-md border border-dashed border-[rgba(var(--color-border),0.4)] p-3 text-xs text-[rgb(var(--color-text-muted))]">
          <FileText size={13} className="mr-1 inline-block" />
          No saved prompts yet. Write prompts and save them for reuse.
        </div>
      )}
    </div>
  );
};

export default InstructionsInputView;
