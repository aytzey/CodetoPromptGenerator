// views/FolderPickerView.tsx
import React, { useState, useEffect } from 'react'
import { Folder, FolderSearch, History, ArrowRight, RefreshCw } from 'lucide-react'
import FolderBrowserView from './FolderBrowserView'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'

interface FolderPickerProps {
  currentPath: string
  onPathSelected: (path: string) => void
  isLoading: boolean
}

const LOCAL_STORAGE_KEY = 'recentFolders'

/**
 * Allows users to type in a folder path or open a "folder browser" (mocked).
 * Also manages and shows recent folder selections.
 */
const FolderPickerView: React.FC<FolderPickerProps> = ({
  currentPath,
  onPathSelected,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState(currentPath)
  const [showBrowser, setShowBrowser] = useState(false)
  const [recentFolders, setRecentFolders] = useState<string[]>([])

  useEffect(() => {
    setInputValue(currentPath)
  }, [currentPath])

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      setRecentFolders(JSON.parse(stored))
    }
  }, [])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    selectNewPath(inputValue.trim())
  }

  const selectNewPath = (path: string) => {
    if (path) {
      onPathSelected(path)
      updateRecentFolders(path)
    }
  }

  const updateRecentFolders = (path: string) => {
    setRecentFolders(prev => {
      const newList = [path, ...prev.filter(p => p !== path)]
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList.slice(0, 3))) // keep up to 3
      return newList.slice(0, 3)
    })
  }

  const openBrowser = () => setShowBrowser(true)
  const closeBrowser = () => setShowBrowser(false)

  const handleFolderSelected = (newPath: string) => {
    setInputValue(newPath)
    selectNewPath(newPath)
    setShowBrowser(false)
  }

  return (
    <div className="space-y-4">
      {/* Manual entry */}
      <form
        onSubmit={handleManualSubmit}
        className="flex flex-col md:flex-row items-stretch md:items-center gap-2"
      >
        <div className="flex-1 relative">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Enter or paste a folder path"
            className="w-full pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Set
        </Button>
        <Button
          type="button"
          onClick={openBrowser}
          disabled={isLoading}
          variant="outline"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950 transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FolderSearch className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Loading...' : 'Browse...'}
        </Button>
      </form>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent Folders */}
        {recentFolders.length > 0 && (
          <Card className="border-dashed border-gray-200 dark:border-gray-800 col-span-1">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <History className="mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent</h4>
                </div>
                <Badge variant="outline" className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {recentFolders.length}
                </Badge>
              </div>
              <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />
              <ScrollArea className="h-[90px] w-full">
                <ul className="space-y-1">
                  {recentFolders.map((pathStr, idx) => (
                    <li key={`${pathStr}-${idx}`} className="group">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start px-2 text-xs h-7 font-normal truncate hover:bg-gray-100 dark:hover:bg-gray-800"
                              onClick={() => selectNewPath(pathStr)}
                            >
                              <Folder className="h-3.5 w-3.5 mr-2 text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                              <span className="truncate">{pathStr}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-gray-800 text-white dark:bg-gray-700">
                            <p className="font-mono text-xs">{pathStr}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Current Path Info */}
        {currentPath && (
          <div className="col-span-3 md:col-span-2 flex items-center bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700">
            <span className="font-medium text-xs text-gray-600 dark:text-gray-300 mr-2">Current Path:</span>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
              {currentPath}
            </div>
          </div>
        )}
      </div>

      {/* FolderBrowser Modal */}
      {showBrowser && (
        <FolderBrowserView
          isOpen={showBrowser}
          onClose={closeBrowser}
          onSelect={handleFolderSelected}
          currentPath={currentPath}
        />
      )}
    </div>
  )
}

export default FolderPickerView