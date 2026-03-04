import React, { useEffect, useMemo, useRef, useState } from "react";
import { BarChart2, CheckCircle, ClipboardCopy, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generateTextualTree } from "@/lib/treeUtils";
import { cn } from "@/lib/utils";
import { buildPromptForPreset } from "@/lib/promptComposer";
import { getModelPreset } from "@/lib/modelPresets";
import { useAppStore } from "@/stores/useAppStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { usePromptStore } from "@/stores/usePromptStore";
import { useSettingsStore } from "@/stores/useSettingStore";
import { useProjectService } from "@/services/projectServiceHooks";
import type { FileData } from "@/types";

const RESET_COPIED_MS = 2200;

function estimateTokens(text = ""): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length + (text.match(/[.,;:!?(){}\[\]<>]/g) || []).length;
}

function fallbackCopyText(text: string): void {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.left = "-1000px";
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fallback is handled below.
    }
  }
  fallbackCopyText(text);
}

const CopyButtonView: React.FC = () => {
  const metaPrompt = usePromptStore((state) => state.metaPrompt);
  const mainInstructions = usePromptStore((state) => state.mainInstructions);
  const selectedModelPresetId = useSettingsStore((state) => state.selectedModelPresetId);

  const selectedFilePaths = useProjectStore((state) => state.selectedFilePaths);
  const filesData = useProjectStore((state) => state.filesData);
  const isLoadingContents = useProjectStore((state) => state.isLoadingContents);
  const setError = useAppStore((state) => state.setError);

  const { loadSelectedFileContents } = useProjectService();

  const [copied, setCopied] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [lastBuildStats, setLastBuildStats] = useState<{
    estimatedInputTokens: number;
    safeInputCapTokens: number;
    omittedFiles: number;
  } | null>(null);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedPreset = getModelPreset(selectedModelPresetId);

  const selectedFiles = useMemo(() => {
    const selected = new Set(selectedFilePaths);
    return filesData.filter((file) => selected.has(file.path));
  }, [filesData, selectedFilePaths]);

  const fileCount = selectedFiles.length;
  const tokenCount =
    selectedFiles.reduce((sum, file) => sum + (file.tokenCount || 0), 0) +
    estimateTokens(metaPrompt) +
    estimateTokens(mainInstructions);
  const charCount =
    selectedFiles.reduce((sum, file) => sum + file.content.length, 0) +
    metaPrompt.length +
    mainInstructions.length;

  const hasInput =
    metaPrompt.trim().length > 0 ||
    mainInstructions.trim().length > 0 ||
    selectedFilePaths.length > 0;
  const isBusy = isBuilding || isLoadingContents;
  const disabled = !hasInput || isBusy;

  const clearCopiedTimer = () => {
    if (!copiedTimerRef.current) return;
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = null;
  };

  useEffect(() => clearCopiedTimer, []);

  const handleCopy = async () => {
    if (disabled) return;

    setIsBuilding(true);
    try {
      await loadSelectedFileContents();

      const projectState = useProjectStore.getState();
      const exclusionState = useExclusionStore.getState();

      const selected = new Set(projectState.selectedFilePaths);
      const liveFiles = projectState.filesData.filter((file) => selected.has(file.path));
      const treeText = generateTextualTree(
        projectState.fileTree,
        exclusionState.globalExclusions,
        exclusionState.extensionFilters,
      );

      const built = buildPromptForPreset({
        presetId: selectedModelPresetId,
        metaPrompt,
        instructions: mainInstructions,
        treeText,
        files: liveFiles,
      });

      await copyText(built.prompt);
      setLastBuildStats({
        estimatedInputTokens: built.estimatedInputTokens,
        safeInputCapTokens: built.safeInputCapTokens,
        omittedFiles: built.omittedFiles,
      });

      setCopied(true);
      clearCopiedTimer();
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, RESET_COPIED_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected copy failure.";
      setError(`Copy failed: ${message}`);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1.5 text-xs">
          {selectedPreset.label}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <FileText size={13} />
          {fileCount} file{fileCount === 1 ? "" : "s"}
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <BarChart2 size={13} />
          {tokenCount.toLocaleString()} tokens
        </Badge>
        <Badge variant="outline" className="text-xs">
          {charCount.toLocaleString()} chars
        </Badge>
        <Badge variant="outline" className="text-xs">
          cap {selectedPreset.budget.safeInputCapTokens.toLocaleString()} tok
        </Badge>
      </div>

      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block">
              <Button
                onClick={handleCopy}
                disabled={disabled}
                className={cn(
                  "h-12 w-full justify-center gap-2 text-sm font-semibold",
                  copied && "bg-emerald-600 text-white hover:bg-emerald-600/90",
                )}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Preparing prompt...
                  </>
                ) : copied ? (
                  <>
                    <CheckCircle />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy />
                    Generate and Copy Prompt
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasInput ? "Generate full prompt and copy to clipboard." : "Add instructions or select files first."}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <p className="text-xs text-[rgb(var(--color-text-muted))]">
        {!hasInput
          ? "Step 3 is locked until you add instructions or select files."
          : lastBuildStats
          ? `Last copy: ~${lastBuildStats.estimatedInputTokens.toLocaleString()} input tokens, cap ${lastBuildStats.safeInputCapTokens.toLocaleString()}, omitted ${lastBuildStats.omittedFiles} file(s).`
          : `Includes ${fileCount} selected file${fileCount === 1 ? "" : "s"} and project tree context.`}
      </p>
    </div>
  );
};

export default React.memo(CopyButtonView);
