// views/SelectedFilesListView.tsx
import React from 'react'
import { File, Folder, FileText, FileCode, Inbox, BarChart2 } from 'lucide-react'

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip"

interface FileData {
  path: string
  content: string
  tokenCount: number
}

interface SelectedFilesListProps {
  selectedFiles: string[]
  filterExtensions: string[]
  filesData: FileData[]
}

/**
 * Displays a list of selected files (and directories if any).
 * Also shows total token count of loaded files.
 */
const SelectedFilesListView: React.FC<SelectedFilesListProps> = ({
  selectedFiles,
  filterExtensions,
  filesData
}) => {
  // Filter out any selected files that don't match the extension filter
  const filteredSelected = filterExtensions.length
    ? selectedFiles.filter(f => matchesAnyExtension(f, filterExtensions))
    : selectedFiles

  const filePaths = new Set(filesData.map(fd => fd.path))
  const directories = filteredSelected.filter(f => !filePaths.has(f))
  const displayedData = filesData.filter(fd => filteredSelected.includes(fd.path))

  const totalTokens = displayedData.reduce((acc, f) => acc + f.tokenCount, 0)
  const totalChars = displayedData.reduce((acc, f) => acc + f.content.length, 0)

  // Get file extension for icon selection
  const getFileIcon = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    
    switch(extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 mr-2 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />;
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        return <FileCode className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400 flex-shrink-0" />;
      case 'json':
      case 'yml':
      case 'yaml':
        return <FileCode className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400 flex-shrink-0" />;
      case 'md':
      case 'txt':
        return <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />;
      case 'html':
      case 'xml':
        return <FileCode className="h-4 w-4 mr-2 text-red-500 dark:text-red-400 flex-shrink-0" />;
      case 'py':
      case 'rb':
      case 'php':
        return <FileCode className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 flex-shrink-0" />;
      default:
        return <File className="h-4 w-4 mr-2 text-teal-500 dark:text-teal-400 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-3">
      {filteredSelected.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 flex flex-col items-center">
          <Inbox className="mx-auto h-12 w-12 opacity-30 mb-3" />
          <p className="text-sm">
            No files or directories selected{filterExtensions.length > 0 ? ', or none match the current filters' : ''}.
          </p>
          {filterExtensions.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap justify-center">
              {filterExtensions.map(ext => (
                <Badge key={ext} variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800">
                  {ext}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-1">
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                {directories.length > 0 && (
                  <span className="mr-1 text-xs">{directories.length} {directories.length === 1 ? 'dir' : 'dirs'}</span>
                )}
                {displayedData.length} {displayedData.length === 1 ? 'file' : 'files'}
              </Badge>
            </div>
            
            {displayedData.length > 0 && (
              <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                <BarChart2 className="h-3 w-3 mr-1" />
                {totalTokens.toLocaleString()} tokens
              </Badge>
            )}
          </div>
        
          <ScrollArea className="h-[180px] pr-4 border rounded-md border-gray-200 dark:border-gray-800">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {directories.map(d => (
                <li key={d} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                  <div className="p-2 flex items-center group">
                    <Folder className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm truncate text-gray-700 dark:text-gray-300">{d}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-gray-800 text-white dark:bg-gray-700">
                          <p className="font-mono text-xs">{d}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Badge variant="outline" className="ml-auto text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      directory
                    </Badge>
                  </div>
                </li>
              ))}

              {displayedData.map(file => {
                // Get the filename from the path for cleaner display
                const filename = file.path.split('/').pop() || file.path;
                
                return (
                  <li key={file.path} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                    <div className="p-2 flex items-center group">
                      {getFileIcon(file.path)}
                      <TooltipProvider>
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
                          <TooltipContent side="top" className="bg-gray-800 text-white dark:bg-gray-700">
                            <p className="font-mono text-xs">{file.path}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge className="ml-2 text-xs bg-indigo-500 text-white">
                        {file.tokenCount.toLocaleString()} tokens
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
          
          {displayedData.length > 0 && (
            <div className="flex justify-between items-center px-1 pt-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Files:</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{displayedData.length}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Tokens:</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{totalTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Chars:</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{totalChars.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SelectedFilesListView

function matchesAnyExtension(fileNameOrPath: string, extensions: string[]): boolean {
  const lower = fileNameOrPath.toLowerCase()
  return extensions.some(ext => lower.endsWith(ext.toLowerCase()))
}