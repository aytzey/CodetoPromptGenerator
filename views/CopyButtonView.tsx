// File: views/CopyButtonView.tsx
// REFACTOR / OVERWRITE
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Copy, CheckCircle, ClipboardCopy, FileCode, Loader2 } from 'lucide-react'; // Added Loader2

// Import Stores and Hooks
import { usePromptStore } from '@/stores/usePromptStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useExclusionStore } from '@/stores/useExclusionStore';
import { useProjectService } from '@/services/projectServiceHooks'; // To reload content
import { FileNode, FileData } from '@/types'; // Use central types

// UI Components
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

// Removed props interface
// interface CopyButtonProps { ... }

// Utility functions remain the same for now, but could be moved to lib/ if reused elsewhere
/**
 * Simple token estimator (naive). Consider replacing with tiktoken.
 */
function estimateTokenCount(text: string): number {
    if (!text) return 0;
    const tokens = text.trim().split(/\s+|[,.;:!?()\[\]{}'"<>]/).filter(token => token.length > 0);
    const specialChars = (text.match(/[,.;:!?()\[\]{}'"<>]/g) || []).length;
    return tokens.length + specialChars;
}

/**
 * Generates a textual representation of a file tree.
 */
function generateTextualTree(
    tree: FileNode[],
    excludedPaths: string[], // Global Exclusions
    filterExtensions: string[],
    depth: number = 0
  ): string {
    let result = '';
    const indent = '  '.repeat(depth);
    const globalExclusionSet = new Set(excludedPaths); // Optimize lookup

    // Filter based on global exclusions first
    const globallyFiltered = tree.filter(node => {
        // Check if the node itself or any parent path segment matches a global exclusion
        const segments = node.relativePath.split('/');
        return !segments.some(segment => globalExclusionSet.has(segment)) &&
               !globalExclusionSet.has(node.relativePath);
    });

    // Then filter based on extensions (if directory, check children recursively)
    const filtered = globallyFiltered.filter(node => nodeMatchesExtensions(node, filterExtensions));

    for (const node of filtered) {
      const icon = node.type === 'directory' ? '📁' : '📄';
      result += `${indent}${icon} ${node.name}\n`;
      if (node.type === 'directory' && node.children) {
        // Pass down original global exclusions and filters for recursive calls
        result += generateTextualTree(
          node.children,
          excludedPaths,
          filterExtensions,
          depth + 1
        );
      }
    }
    return result;
  }

  function nodeMatchesExtensions(node: FileNode, extensions: string[]): boolean {
    if (extensions.length === 0) return true; // No filter means match
    if (node.type === 'directory') {
      // Directory matches if it OR any descendant matches
      if (!node.children || node.children.length === 0) return false; // Empty dir doesn't match unless filter empty
      return node.children.some(child => nodeMatchesExtensions(child, extensions));
    } else {
      // File matches if its extension is in the list
      const lowerName = node.name.toLowerCase();
      return extensions.some(ext => lowerName.endsWith(ext.toLowerCase()));
    }
  }


const CopyButtonView: React.FC = () => {
  // Get state from stores
  const { metaPrompt, mainInstructions } = usePromptStore();
  const { selectedFilePaths, filesData, fileTree, isLoadingContents } = useProjectStore();
  const { globalExclusions, extensionFilters } = useExclusionStore();

  // Get service actions
  const { loadSelectedFileContents } = useProjectService();

  // Local component state
  const hiddenTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isProcessingCopy, setIsProcessingCopy] = useState<boolean>(false);

  // We use the filesData directly from the store, assuming it's kept up-to-date
  // by effects in index.tsx or the service hooks.

  // Calculate derived values using useMemo for efficiency
  const { totalTokens, totalChars, selectedFileCount } = useMemo(() => {
    const currentFilesData = filesData.filter(fd => selectedFilePaths.includes(fd.path));
    const fileTok = currentFilesData.reduce((acc, file) => acc + (file.tokenCount || 0), 0);
    const metaTok = estimateTokenCount(metaPrompt);
    const mainTok = estimateTokenCount(mainInstructions);
    const totalTok = fileTok + metaTok + mainTok;

    const totalCh = currentFilesData.reduce((acc, file) => acc + file.content.length, 0);
    const selFileCount = selectedFilePaths.filter(f => !f.endsWith('/')).length; // Count only files

    return { totalTokens: totalTok, totalChars: totalCh, selectedFileCount: selFileCount };
  }, [filesData, selectedFilePaths, metaPrompt, mainInstructions]);


  const handleCopy = async () => {
    setIsProcessingCopy(true);
    try {
      // 1. Ensure latest file content is loaded (re-fetch)
      await loadSelectedFileContents();
      // Get the freshly loaded data from the store *after* the await
      const freshFilesData = useProjectStore.getState().filesData;
      const freshSelectedPaths = useProjectStore.getState().selectedFilePaths; // Use latest selection
      // Filter data based on current selection again
      const relevantFilesData = freshFilesData.filter(fd => freshSelectedPaths.includes(fd.path));


      // 2. Generate the text parts
      let combined = '';
      if (metaPrompt.trim()) {
        combined += `# Meta Prompt:\n${metaPrompt.trim()}\n\n`;
      }
      if (mainInstructions.trim()) {
        combined += `# Main Instructions:\n${mainInstructions.trim()}\n\n`;
      }

      // Generate tree based on current filters/exclusions from stores
      const treeText = generateTextualTree(fileTree, globalExclusions, extensionFilters);
      if (treeText.trim()) {
        combined += `# Project Tree:\n${treeText.trim()}\n\n`;
      }

      // 3. Add selected file contents
      if (relevantFilesData.length > 0) {
        combined += `# Selected Files:\n`;
        // Sort files by path for consistent output
        relevantFilesData.sort((a, b) => a.path.localeCompare(b.path));
        for (const f of relevantFilesData) {
          combined += `## File: ${f.path}\n${f.content}\n\n`; // Add extra newline for separation
        }
      }

       // Remove trailing newlines for cleaner final output
       combined = combined.trimEnd();

      // 4. Copy to clipboard
      try {
        await navigator.clipboard.writeText(combined);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500); // Slightly shorter success message duration
      } catch (clipboardError) {
        console.warn("Clipboard API failed, attempting fallback:", clipboardError);
        fallbackCopyMethod(combined);
      }
    } catch (error) {
        console.error("Error during copy process:", error);
        // Show error via global store or local alert
        alert("An error occurred while preparing the content to copy.");
    } finally {
      setIsProcessingCopy(false);
    }
  };

  // Fallback copy method remains the same
  const fallbackCopyMethod = (text: string) => {
    if (!hiddenTextAreaRef.current) return;
    hiddenTextAreaRef.current.value = text;
    hiddenTextAreaRef.current.select();
    try {
      document.execCommand('copy');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error('Fallback copy method failed:', err);
      alert('Failed to copy to clipboard using fallback method.');
    }
     // Deselect text after copy attempt
    window.getSelection()?.removeAllRanges();
    if (hiddenTextAreaRef.current) {
        hiddenTextAreaRef.current.blur();
    }
  };

  // Determine if ready to copy
  const isReady = useMemo(() => selectedFileCount > 0 || metaPrompt.trim() || mainInstructions.trim(),
    [selectedFileCount, metaPrompt, mainInstructions]
  );
  const isDisabled = !isReady || isProcessingCopy || isLoadingContents;

  return (
    <div className="relative w-full">
      {/* Hidden textarea for fallback copy */}
      <textarea
        ref={hiddenTextAreaRef}
        className="fixed -top-[1000px] left-0 opacity-0 w-0 h-0" // Ensure it's completely out of view
        readOnly
        aria-hidden="true"
        tabIndex={-1} // Prevent tabbing
      />

      <div className="space-y-4">
        {/* Stats display */}
        {(selectedFileCount > 0 || totalTokens > 0) && ( // Show stats if files selected or prompts have tokens
          <div className="flex flex-wrap gap-2 justify-center">
            {selectedFileCount > 0 && (
                 <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                   <FileCode size={14} className="mr-1" />
                   {selectedFileCount} file{selectedFileCount !== 1 ? 's' : ''}
                 </Badge>
            )}
            {totalTokens > 0 && (
                 <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                   <span className="font-mono">{totalTokens.toLocaleString()}</span> tokens
                 </Badge>
            )}
             {totalChars > 0 && (
                <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800">
                  <span className="font-mono">{totalChars.toLocaleString()}</span> chars
                </Badge>
             )}
          </div>
        )}

        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Wrap button in div for Tooltip when disabled */}
              <div>
                <Button
                  variant="default"
                  className={cn(
                    "w-full h-12 flex items-center justify-center gap-2 text-base font-medium relative overflow-hidden transition-all duration-300",
                    copySuccess ? "bg-teal-500 hover:bg-teal-600" : "bg-indigo-500 hover:bg-indigo-600",
                    isDisabled && "opacity-60 cursor-not-allowed" // More pronounced disabled state
                  )}
                  onClick={handleCopy}
                  disabled={isDisabled}
                  aria-live="polite" // Announce changes for screen readers
                >
                  {/* Default State */}
                  <div className={cn(
                    "flex items-center justify-center gap-2 transition-transform duration-300",
                    copySuccess || isProcessingCopy || isLoadingContents ? "transform -translate-y-12 opacity-0" : "translate-y-0 opacity-100" // Slide out only if copied/loading
                  )}>
                    <Copy size={18} />
                    <span>Copy All to Clipboard</span>
                  </div>

                  {/* Loading State */}
                   <div className={cn(
                    "absolute inset-0 flex items-center justify-center gap-2 text-white transition-transform duration-300",
                    isProcessingCopy || isLoadingContents ? "transform translate-y-0 opacity-100" : "transform translate-y-12 opacity-0"
                  )}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{isLoadingContents ? "Loading Content..." : "Processing..."}</span>
                  </div>

                  {/* Success State */}
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center gap-2 text-white transition-transform duration-300",
                    copySuccess ? "transform translate-y-0 opacity-100" : "transform translate-y-12 opacity-0"
                  )}>
                    <CheckCircle size={18} />
                    <span>Copied!</span>
                  </div>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
               {!isReady ? ( <p>Select files or add instructions first</p> ) :
                isDisabled ? ( <p>Processing or loading content...</p> ) :
                ( <p>Copy prompt & file contents</p> )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default React.memo(CopyButtonView); // Memoize as props are removed