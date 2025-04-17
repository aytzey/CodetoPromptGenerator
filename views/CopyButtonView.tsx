// File: views/CopyButtonView.tsx
// REFACTOR #2 – Prompt‑format overhaul for superior LLM results
import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Copy, CheckCircle, ClipboardCopy, FileCode, Loader2,
} from 'lucide-react';

import { usePromptStore }   from '@/stores/usePromptStore';
import { useProjectStore }  from '@/stores/useProjectStore';
import { useExclusionStore } from '@/stores/useExclusionStore';
import { useProjectService } from '@/services/projectServiceHooks';

import { Button }            from '@/components/ui/button';
import { Badge }             from '@/components/ui/badge';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import { cn }                from '@/lib/utils';
import type { FileNode, FileData } from '@/types';

/* ════════════════════════════════════════════════════════════════ */
/* 🔸 LOCAL HELPER UTILITIES                                       */
/* ════════════════════════════════════════════════════════════════ */

/** naive token approximation (kept for stats only) */
function estimateTokens(txt = '') {
  if (!txt) return 0;
  return txt.trim().split(/\s+/).length + (txt.match(/[.,;:!?(){}\[\]<>]/g) || []).length;
}

/** language‑id per file‑extension – extend as needed */
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
  return `\`\`\`text
${tree.trimEnd()}
\`\`\``;
}

/** render each file as ```lang path … ``` block */
function renderFiles(data: FileData[]) {
  return data
    .map(f => {
      const lang = extToLang(f.path);
      return `\`\`\`${lang} ${f.path}
${f.content.trimEnd()}
\`\`\``;
    })
    .join('\n\n');
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
  if (treeTxt.trim()) {
    ctx.push(`# PROJECT TREE\n${renderTree(treeTxt)}`);
  }
  if (files.length) {
    ctx.push(`# SOURCE FILES\n${renderFiles(files)}`);
  }
  if (ctx.length) {
    parts.push(`<|CODE_CONTEXT|>\n${ctx.join('\n\n')}\n<|END|>`);
  }
  return parts.join('\n\n');
}

/** replicate the exclusion + extension filtering from existing logic */
function generateTextualTree(
  tree: FileNode[],
  globalExcludes: string[],
  filterExt: string[],
  depth = 0,
): string {
  const indent   = '  '.repeat(depth);
  const excludes = new Set(globalExcludes);

  return tree
    .filter(n => {
      const segs = n.relativePath.split('/');
      return !segs.some(s => excludes.has(s)) && !excludes.has(n.relativePath);
    })
    .filter(n => {
      if (filterExt.length === 0) return true;
      if (n.type === 'directory') return true;
      const lower = n.name.toLowerCase();
      return filterExt.some(e => lower.endsWith(e.toLowerCase()));
    })
    .map(n => {
      const icon = n.type === 'directory' ? '📁' : '📄';
      const line = `${indent}${icon} ${n.name}`;
      if (n.type === 'directory' && n.children) {
        const sub = generateTextualTree(n.children, globalExcludes, filterExt, depth + 1);
        return `${line}\n${sub}`;
      }
      return line;
    })
    .join('\n');
}

/* ════════════════════════════════════════════════════════════════ */
/* 🔸 REACT COMPONENT                                              */
/* ════════════════════════════════════════════════════════════════ */

const CopyButtonView: React.FC = () => {
  /* —— global state —— */
  const { metaPrompt, mainInstructions }  = usePromptStore();
  const {
    selectedFilePaths, filesData, fileTree, isLoadingContents,
  } = useProjectStore();
  const { globalExclusions, extensionFilters } = useExclusionStore();

  /* —— services —— */
  const { loadSelectedFileContents } = useProjectService();

  /* —— local UI state —— */
  const hiddenTA          = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied]           = useState(false);
  const [isBuilding, setIsBuilding]   = useState(false);

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
      /* 1️⃣ ensure freshest content */
      await loadSelectedFileContents();
      const fresh   = useProjectStore.getState();
      const liveFiles = fresh.filesData.filter(fd => fresh.selectedFilePaths.includes(fd.path));

      /* 2️⃣ (b)uild final string */
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

      /* 3️⃣ copy – Clipboard API first, fallback second */
      await navigator.clipboard.writeText(prompt).catch(() => {
        if (!hiddenTA.current) throw new Error('Hidden textarea missing');
        hiddenTA.current.value = prompt;
        hiddenTA.current.select();
        document.execCommand('copy');
        hiddenTA.current.blur();
      });

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      /* eslint‑disable-next-line no-alert */
      alert(`Copy failed: ${(err as Error).message}`);
      console.error(err);
    } finally {
      setIsBuilding(false);
    }
  };

  /* —— UI —— */
  const disabled = !ready || isBuilding || isLoadingContents;

  return (
    <div className="relative w-full">
      {/* invisible textarea for fallback copy */}
      <textarea ref={hiddenTA} className="sr-only" aria-hidden="true" />

      {/* stats row */}
      {(fileCount > 0 || tokenCount > 0) && (
        <div className="flex justify-center flex-wrap gap-2 mb-4">
          {fileCount > 0 && (
            <Badge variant="outline">
              <FileCode size={14} className="mr-1" />
              {fileCount} file{fileCount !== 1 && 's'}
            </Badge>
          )}
          <Badge variant="outline">
            {tokenCount.toLocaleString()} tokens
          </Badge>
          {charCount > 0 && (
            <Badge variant="outline">
              {charCount.toLocaleString()} chars
            </Badge>
          )}
        </div>
      )}

      {/* copy button */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleCopy}
              disabled={disabled}
              className={cn(
                'w-full h-12 flex items-center justify-center gap-2 transition',
                copied ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {isBuilding || isLoadingContents ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Building…
                </>
              ) : copied ? (
                <>
                  <CheckCircle size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Prompt
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {ready
              ? 'Copy generated prompt to clipboard'
              : 'Select files or add instructions first'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default React.memo(CopyButtonView);
