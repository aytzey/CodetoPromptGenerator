// File: views/SelectedFilesListView.tsx
// REFACTOR / OVERWRITE
import React, { useMemo } from 'react'; // Added useMemo
import { File, Folder, FileText, FileCode, Inbox, BarChart2 } from 'lucide-react';

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator"; // Separator not used
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import Stores
import { useProjectStore } from '@/stores/useProjectStore';
import { useExclusionStore } from '@/stores/useExclusionStore';
import { FileData } from '@/types'; // Use central types

// Removed props interface
// interface SelectedFilesListProps { ... }

// Helper function remains the same
function matchesAnyExtension(fileNameOrPath: string, extensions: string[]): boolean {
    if (extensions.length === 0) return true; // Match all if no filters
    const lower = fileNameOrPath.toLowerCase();
    // Ensure extensions start with a dot for comparison
    return extensions.some(ext => lower.endsWith(ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
}

// File icon logic remains the same
const getFileIcon = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    switch(extension) {
      case 'js': case 'jsx': case 'ts': case 'tsx':
        return <FileCode className="h-4 w-4 mr-2 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />;
      case 'css': case 'scss': case 'sass': case 'less':
        return <FileCode className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400 flex-shrink-0" />;
      case 'json': case 'yml': case 'yaml':
        return <FileCode className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400 flex-shrink-0" />;
      case 'md': case 'txt':
        return <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />;
      case 'html': case 'xml':
        return <FileCode className="h-4 w-4 mr-2 text-red-500 dark:text-red-400 flex-shrink-0" />;
      case 'py': case 'rb': case 'php':
        return <FileCode className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 flex-shrink-0" />;
      default:
        return <File className="h-4 w-4 mr-2 text-teal-500 dark:text-teal-400 flex-shrink-0" />;
    }
};


const SelectedFilesListView: React.FC = () => {
  // Get state from stores
  const selectedFilePaths = useProjectStore((state) => state.selectedFilePaths);
  const filesData = useProjectStore((state) => state.filesData);
  const extensionFilters = useExclusionStore((state) => state.extensionFilters);

  // --- Derived State Calculation with useMemo ---
  const {
      filteredSelectedPaths,
      displayedFilesData,
      directoryPaths,
      totalTokens,
      totalChars
  } = useMemo(() => {
    // 1. Filter selected paths by extension filters
    const filteredSelected = extensionFilters.length
      ? selectedFilePaths.filter(f => matchesAnyExtension(f, extensionFilters))
      : selectedFilePaths;

    // 2. Separate files (present in filesData) from directories (not in filesData)
    const loadedFilePathsSet = new Set(filesData.map(fd => fd.path));
    const dirs = filteredSelected.filter(f => !loadedFilePathsSet.has(f)); // Assume non-loaded are dirs for now
    const displayedData = filesData.filter(fd => filteredSelected.includes(fd.path));

    // 3. Calculate stats based on displayed files
    const tokens = displayedData.reduce((acc, f) => acc + (f.tokenCount || 0), 0);
    const chars = displayedData.reduce((acc, f) => acc + (f.content?.length || 0), 0);

    return {
        filteredSelectedPaths: filteredSelected,
        displayedFilesData: displayedData.sort((a, b) => a.path.localeCompare(b.path)), // Sort files
        directoryPaths: dirs.sort((a, b) => a.localeCompare(b)), // Sort directories
        totalTokens: tokens,
        totalChars: chars
    };
  }, [selectedFilePaths, filesData, extensionFilters]); // Dependencies

  const fileCount = displayedFilesData.length;
  const dirCount = directoryPaths.length;

  return (
    <div className="space-y-3">
      {filteredSelectedPaths.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 flex flex-col items-center">
          <Inbox className="mx-auto h-12 w-12 opacity-30 mb-3" />
          <p className="text-sm">
            No files selected
            {extensionFilters.length > 0 ? ', or none match filters.' : '.'}
          </p>
           {extensionFilters.length > 0 && (
             <div className="mt-2 flex gap-1 flex-wrap justify-center max-w-xs mx-auto">
               {extensionFilters.map(ext => (
                 <Badge key={ext} variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800">
                   {ext}
                 </Badge>
               ))}
             </div>
           )}
        </div>
      ) : (
        <>
          {/* Summary Badges */}
          <div className="flex flex-wrap gap-2 items-center text-xs mb-2">
              {(dirCount > 0 || fileCount > 0) && (
                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                    {dirCount > 0 && `${dirCount} ${dirCount === 1 ? 'dir' : 'dirs'}`}
                    {dirCount > 0 && fileCount > 0 && ', '}
                    {fileCount > 0 && `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`}
                  </Badge>
              )}
              {totalTokens > 0 && (
                <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                    <BarChart2 className="h-3 w-3 mr-1" />
                    {totalTokens.toLocaleString()} tokens
                </Badge>
              )}
          </div>

          <ScrollArea className="h-[180px] pr-3 border rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {dirCount === 0 && fileCount === 0 ? (
                 <div className="flex items-center justify-center h-full text-gray-400 italic text-sm">
                     No matching selected items.
                 </div>
            ) : (
                 <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {/* Render Directories */}
                    {directoryPaths.map(d => (
                        <li key={d} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150">
                        <div className="p-2 flex items-center group">
                            <Folder className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                            <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <span className="text-sm truncate text-gray-700 dark:text-gray-300">{d}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-800 text-white dark:bg-gray-700 max-w-xs">
                                <p className="font-mono text-xs break-all">{d}</p>
                                </TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                            <Badge variant="outline" className="ml-auto text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 px-1.5 py-0">
                            dir
                            </Badge>
                        </div>
                        </li>
                    ))}

                    {/* Render Files */}
                    {displayedFilesData.map(file => {
                        const filename = file.path.split(/[/\\]/).pop() || file.path; // Handle both slashes
                        return (
                        <li key={file.path} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150">
                            <div className="p-2 flex items-center group">
                            {getFileIcon(file.path)}
                             <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate text-gray-700 dark:text-gray-300 font-medium">
                                            {filename}
                                        </div>
                                        <div className="text-xs truncate text-gray-500 dark:text-gray-400">
                                            {file.path}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-gray-800 text-white dark:bg-gray-700 max-w-xs">
                                    <p className="font-mono text-xs break-all">{file.path}</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Badge variant="secondary" className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0">
                                {file.tokenCount?.toLocaleString() ?? 0} tk
                            </Badge>
                            </div>
                        </li>
                        );
                    })}
                    </ul>
            )}
          </ScrollArea>

           {/* Optional Detailed Stats Footer */}
           {fileCount > 0 && (
             <div className="flex justify-end items-center px-1 pt-2 text-xs text-gray-500 dark:text-gray-400 gap-3">
               <span>Files: <span className="font-medium text-gray-700 dark:text-gray-300">{fileCount}</span></span>
               <span>Tokens: <span className="font-medium text-gray-700 dark:text-gray-300">{totalTokens.toLocaleString()}</span></span>
               <span>Chars: <span className="font-medium text-gray-700 dark:text-gray-300">{totalChars.toLocaleString()}</span></span>
             </div>
           )}
        </>
      )}
    </div>
  );
};

export default React.memo(SelectedFilesListView); // Memoize as props are removed