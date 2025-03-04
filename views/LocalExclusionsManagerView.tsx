import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, X, FolderX, Plus, FileX, Loader2, AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LocalExclusionsManagerViewProps {
  projectPath: string
  onChange?: (newList: string[]) => void
}

const LocalExclusionsManagerView: React.FC<LocalExclusionsManagerViewProps> = ({
  projectPath,
  onChange
}) => {
  const [localList, setLocalList] = useState<string[]>([])
  const [newEntry, setNewEntry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectPath) {
      fetchLocalExclusions()
    }
  }, [projectPath])

  async function fetchLocalExclusions() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(
        `http://localhost:5000/api/localExclusions?projectPath=${encodeURIComponent(projectPath)}`
      )
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.success) {
        const list = data.localExclusions || []
        setLocalList(list)
        if (onChange) onChange(list)
      } else {
        setError(data.error || 'Unknown error fetching localExclusions')
      }
    } catch (err: any) {
      setError(`Failed to load local exclusions: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function saveLocalExclusions(updated: string[]) {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(
        `http://localhost:5000/api/localExclusions?projectPath=${encodeURIComponent(projectPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localExclusions: updated })
        }
      )
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to save local exclusions')
      }
      setLocalList(data.localExclusions || [])
      if (onChange) {
        onChange(data.localExclusions || [])
      }
    } catch (err: any) {
      setError(`Failed to save local exclusions: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    const trimmed = newEntry.trim()
    if (!trimmed) return
    if (!localList.includes(trimmed)) {
      const updated = [...localList, trimmed]
      setNewEntry('')
      saveLocalExclusions(updated)
    } else {
      setNewEntry('')
    }
  }

  function handleRemove(item: string) {
    const updated = localList.filter(i => i !== item)
    saveLocalExclusions(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  // Common local exclusion suggestions
  const suggestions = ['package-lock.json', 'yarn.lock', '.env', 'README.md', 'LICENSE'];

  return (
    <Card className="p-4 space-y-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileX size={18} className="text-purple-500 dark:text-purple-400" />
          <span className="text-base font-medium text-gray-800 dark:text-gray-200">
            Project-Specific Exclusions
          </span>
          
          {localList.length > 0 && (
            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
              {localList.length}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 -mt-1">
        Files shown in tree but skipped from "Select All" operation
      </div>

      {error && (
        <Alert variant="destructive" className="bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 py-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Input
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Example: package-lock.json"
            className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {newEntry && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setNewEntry('')}
              disabled={loading}
            >
              <X size={14} />
            </Button>
          )}
        </div>
        <Button 
          onClick={handleAdd} 
          disabled={loading || !newEntry.trim()}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Plus size={16} className="mr-1" />
              Add
            </>
          )}
        </Button>
      </div>

      {/* Suggestions */}
      {!loading && newEntry === '' && (
        <div className="flex flex-wrap gap-1 -mt-1">
          {suggestions.map(suggestion => (
            <Badge 
              key={suggestion} 
              variant="outline" 
              className="cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              onClick={() => setNewEntry(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className="h-32 border rounded-md border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        {loading && localList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-3">
            <Loader2 size={20} className="animate-spin text-gray-400 mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Loading exclusions...</p>
          </div>
        ) : (!localList || localList.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full py-3 text-gray-500 dark:text-gray-400">
            <AlertTriangle size={20} className="mb-1 opacity-50" />
            <p className="text-xs text-center">
              No project-specific exclusions defined.<br />
              Add files you want to exclude from "Select All".
            </p>
          </div>
        ) : (
          <div className="p-2">
            <ul className="space-y-1.5">
              {localList.map((item) => (
                <li
                  key={item}
                  className="flex justify-between items-center bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 group"
                >
                  <div className="flex items-center">
                    <FileX size={14} className="text-purple-400 dark:text-purple-500 mr-2 opacity-70" />
                    <span className="font-mono">{item}</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(item)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-50 group-hover:opacity-100"
                          disabled={loading}
                        >
                          <X size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Remove from exclusions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ScrollArea>
    </Card>
  )
}

export default LocalExclusionsManagerView