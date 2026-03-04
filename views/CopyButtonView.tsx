import React, { useState, useMemo } from "react";
import {
  CheckCircle,
  Loader2,
  BarChart2,
  FileText,
  Sparkles,
} from "lucide-react";

import { usePromptStore } from "@/stores/usePromptStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useAppStore } from "@/stores/useAppStore";
import { useProjectService } from "@/services/projectServiceHooks";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { generateTextualTree } from "@/lib/treeUtils";
import type { FileData } from "@/types";

/* ════════════════════════════════════════════════════════════════ */
/* 🔸 LOCAL HELPER UTILITIES                                       */
/* ════════════════════════════════════════════════════════════════ */

/** naive token approximation (kept for stats only) */
function estimateTokens(txt = '') {
  if (!txt) return 0;
  return txt.trim().split(/\s+/).length + (txt.match(/[.,;:!?(){}\[\]<>]/g) || []).length;
}

/** language‑id per file‑extension – extend as needed */
function extToLang(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'ts':   return 'ts';
    case 'tsx':  return 'tsx';
    case 'js':   return 'js';
    case 'jsx':  return 'jsx';
    case 'py':   return 'python';
    case 'rb':   return 'ruby';
    case 'php':  return 'php';
    case 'json': return 'json';
    case 'yml':  return 'yaml';
    case 'md':   return 'md';
    case 'html': return 'html';
    case 'css':
    case 'scss': return 'css';
    default:     return '';       // let model auto‑detect
  }
}

/** render a file‑tree as indented list; fenced to freeze whitespace */
function renderTree(tree: string) {
  return tree.trim() ? `\`\`\`text\n${tree.trimEnd()}\n\`\`\`` : '';
}

/** render each file as ```lang path … ``` block */
function renderFiles(data: FileData[]) {
  return data
    .map(f => {
      const lang = extToLang(f.path);
      return `\`\`\`${lang} ${f.path}\n${f.content.trimEnd()}\n\`\`\``;
    })
    .join('\n\n');
}

/** fallback copy using a temporary textarea (for older browsers like Safari) */
function fallbackCopyText(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.left = '-1000px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

/** final prompt assembler – pure function for testability */
function buildPrompt(
  meta: string,
  user: string,
  treeTxt: string,
  files: FileData[],
) {
  const parts: string[] = [];

  if (meta.trim()) {
    parts.push(`<|SYSTEM|>\n${meta.trim()}\n<|END|>`);
  }
  if (user.trim()) {
    parts.push(`<|USER|>\n${user.trim()}\n<|END|>`);
  }
  const ctx: string[] = [];
  const renderedTree = renderTree(treeTxt);
  if (renderedTree) {
    ctx.push(`# PROJECT TREE\n${renderedTree}`);
  }
  if (files.length) {
    ctx.push(`# SOURCE FILES\n${renderFiles(files)}`);
  }
  if (ctx.length) {
    parts.push(`<|CODE_CONTEXT|>\n${ctx.join('\n\n')}\n<|END|>`);
  }
  return parts.join('\n\n');
}

/* ════════════════════════════════════════════════════════════════ */
/* 🔸 REACT COMPONENT                                              */
/* ════════════════════════════════════════════════════════════════ */

const CopyButtonView: React.FC = () => {
  /* —— global state —— */
  const metaPrompt = usePromptStore(s => s.metaPrompt);
  const mainInstructions = usePromptStore(s => s.mainInstructions);
  
  const selectedFilePaths = useProjectStore(s => s.selectedFilePaths);
  const filesData = useProjectStore(s => s.filesData);
  const fileTree = useProjectStore(s => s.fileTree);
  const isLoadingContents = useProjectStore(s => s.isLoadingContents);
  
  const globalExclusions = useExclusionStore(s => s.globalExclusions);
  const extensionFilters = useExclusionStore(s => s.extensionFilters);
  const setError = useAppStore(s => s.setError);

  /* —— services —— */
  const { loadSelectedFileContents } = useProjectService();

  /* —— local UI state —— */
  const [copied, setCopied] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [animateGlow, setAnimateGlow] = useState(false);

  /* —— derived stats —— */
  const { fileCount, tokenCount, charCount } = useMemo(() => {
    const current = filesData.filter(f => selectedFilePaths.includes(f.path));
    return {
      fileCount : current.length,
      tokenCount: current.reduce((a, f) => a + (f.tokenCount || 0), 0)
                  + estimateTokens(metaPrompt) + estimateTokens(mainInstructions),
      charCount : current.reduce((a, f) => a + f.content.length, 0),
    };
  }, [filesData, selectedFilePaths, metaPrompt, mainInstructions]);

  const ready = Boolean(
    metaPrompt.trim() || mainInstructions.trim() || selectedFilePaths.length,
  );

  /* —— ACTION: build + copy —— */
  const handleCopy = async () => {
    setIsBuilding(true);
    try {
      /* 1️⃣ ensure freshest content */
      await loadSelectedFileContents();
      const fresh = useProjectStore.getState();
      const liveFiles = fresh.filesData.filter(fd => fresh.selectedFilePaths.includes(fd.path));

      /* 2️⃣ (b)uild final string */
      const treeTxt = generateTextualTree(
        fileTree,
        globalExclusions,
        extensionFilters,
      );
      const prompt = buildPrompt(
        metaPrompt,
        mainInstructions,
        treeTxt,
        liveFiles,
      );

      /* 3️⃣ copy – Clipboard API first, fallback second */
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(prompt);
        } else {
          fallbackCopyText(prompt);
        }
      } catch {
        fallbackCopyText(prompt);
      }

      setCopied(true);
      setAnimateGlow(true);
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setAnimateGlow(false), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected copy failure.";
      setError(`Copy failed: ${message}`);
    } finally {
      setIsBuilding(false);
    }
  };

  /* —— UI —— */
  const disabled = !ready || isBuilding || isLoadingContents;

    return (
      <div className="relative w-full">

      {/* Enhanced stats row */}
      {(fileCount > 0 || tokenCount > 0) && (
        <div className="flex justify-center flex-wrap gap-3 mb-4">
          {fileCount > 0 && (
            <Badge className="bg-[rgba(123,147,253,0.1)] text-[rgb(123,147,253)] border border-[rgba(123,147,253,0.3)] py-1 px-3 flex items-center">
              <FileText size={14} className="mr-1.5" />
              {fileCount} file{fileCount !== 1 && 's'}
            </Badge>
          )}
          <Badge className="bg-[rgba(80,250,123,0.1)] text-[rgb(80,250,123)] border border-[rgba(80,250,123,0.3)] py-1 px-3 flex items-center">
            <BarChart2 size={14} className="mr-1.5" />
            {tokenCount.toLocaleString()} tokens
          </Badge>
          {charCount > 0 && (
            <Badge className="bg-[rgba(189,147,249,0.1)] text-[rgb(189,147,249)] border border-[rgba(189,147,249,0.3)] py-1 px-3 flex items-center">
              <span className="mr-1.5 font-mono text-xs">{ '{' }</span>
              {charCount.toLocaleString()} chars
            </Badge>
          )}
        </div>
      )}

      {/* Enhanced copy button */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "relative rounded-xl overflow-hidden",
              animateGlow && "after:absolute after:inset-0 after:bg-[rgba(123,147,253,0.3)] after:animate-ping after:opacity-0"
            )}>
              <Button
                onClick={handleCopy}
                disabled={disabled}
                className={cn(
                  `relative w-full h-14 flex items-center justify-center gap-2 transition-all duration-300 text-lg font-medium rounded-xl`,
                  copied 
                    ? `bg-gradient-to-r from-[rgb(80,250,123)] to-[rgb(139,233,253)] text-[rgb(15,16,36)]` 
                    : `bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(189,147,249)] text-white`,
                  disabled && 'opacity-50 cursor-not-allowed',
                  'shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.4)] hover:-translate-y-0.5'
                )}
              >
                {isBuilding || isLoadingContents ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,16,36,0.2)] to-[rgba(15,16,36,0.4)] animate-pulse"></div>
                    <Loader2 size={22} className="animate-spin" />
                    <span>Generating Prompt...</span>
                  </>
                ) : copied ? (
                  <>
                    <CheckCircle size={22} strokeWidth={2.5} />
                    <span>Copied Successfully!</span>
                  </>
                ) : (
                  <>
                    <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-[shimmer_2s_infinite]"></div>
                    <Sparkles size={22} className="mr-1" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-[rgba(15,16,36,0.95)] border border-[rgba(60,63,87,0.7)] shadow-xl backdrop-blur-lg">
            {ready
              ? 'Copy generated prompt to clipboard'
              : 'Select files or add instructions first'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Extra micro-info text */}
      {ready && !copied && !isBuilding && !isLoadingContents && (
        <div className="mt-3 text-center text-xs text-[rgb(140,143,170)] animate-fade-in">
          <p>
            Your prompt will include{" "}
            {fileCount === 1 ? "1 file" : `${fileCount} files`} and project structure information
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(CopyButtonView);
