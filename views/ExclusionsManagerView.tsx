import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pencil, Save, Plus, X, AlertTriangle, FolderMinus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ExclusionsManagerProps {
  excludedPaths: string[]
  onUpdateExclusions: (paths: string[]) => Promise<void>
}

const ExclusionsManagerView: React.FC<ExclusionsManagerProps> = ({
  excludedPaths,
  onUpdateExclusions
}) => {
  const [localExclusions, setLocalExclusions] = useState<string[]>([])
  const [newExclusion, setNewExclusion] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalExclusions(excludedPaths)
  }, [excludedPaths])

  const handleAdd = () => {
    if (!newExclusion.trim()) return
    const trimmed = newExclusion.trim()
    if (localExclusions.includes(trimmed)) {
      setNewExclusion('')
      return
    }
    setLocalExclusions(prev => [...prev, trimmed])
    setNewExclusion('')
  }

  const handleRemove = (exclusion: string) => {
    setLocalExclusions(prev => prev.filter(e => e !== exclusion))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdateExclusions(localExclusions)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving exclusions:', error)
      alert('Failed to save exclusions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  // Common exclusion suggestions
  const suggestions = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.DS_Store'];

  return (
    <Card className="p-4 space-y-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderMinus size={18} className="text-rose-500 dark:text-rose-400" />
          <Label className="text-base font-medium text-gray-800 dark:text-gray-200">Global Exclusions</Label>
          
          {localExclusions.length > 0 && (
            <Badge variant="outline" className="ml-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
              {localExclusions.length}
            </Badge>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isEditing ? "default" : "outline"}
                size="sm" 
                onClick={() => (isEditing ? handleSave() : setIsEditing(true))} 
                disabled={isSaving}
                className={isEditing 
                  ? "bg-teal-500 hover:bg-teal-600 text-white" 
                  : "border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                }
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save size={16} className="mr-1" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Pencil size={16} className="mr-1" />
                    Edit List
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isEditing ? "Save your changes" : "Edit the exclusion list"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Input
                value={newExclusion}
                onChange={(e) => setNewExclusion(e.target.value)}
                placeholder="e.g. node_modules"
                className="pr-20 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                onKeyDown={handleKeyDown}
              />
              {newExclusion && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setNewExclusion('')}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleAdd}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <Plus size={16} className="mr-1" />
              Add
            </Button>
          </div>
          
          {/* Suggestions */}
          {newExclusion === '' && (
            <div className="flex flex-wrap gap-1 mt-1">
              {suggestions.map(suggestion => (
                <Badge 
                  key={suggestion} 
                  variant="outline" 
                  className="cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  onClick={() => setNewExclusion(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          )}
          
          <ScrollArea className="h-32 border rounded-md border-gray-200 dark:border-gray-800 p-1 bg-gray-50 dark:bg-gray-800">
            {localExclusions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-3 text-gray-500 dark:text-gray-400">
                <AlertTriangle size={20} className="mb-1 opacity-50" />
                <p className="text-xs text-center">
                  No exclusions defined.<br />Add directories you want to ignore.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {localExclusions.map((exclusion) => (
                  <li
                    key={exclusion}
                    className="flex justify-between items-center bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 group"
                  >
                    <span className="font-mono">{exclusion}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(exclusion)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-50 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="h-24 border rounded-md border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          {localExclusions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-3 text-gray-500 dark:text-gray-400">
              <p className="text-xs italic">No exclusions defined</p>
            </div>
          ) : (
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
                {localExclusions.map(exclusion => (
                  <Badge
                    key={exclusion}
                    variant="outline"
                    className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 py-1 px-2 font-mono text-xs"
                  >
                    {exclusion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
        These paths will be excluded from all projects.
      </div>
    </Card>
  )
}

export default ExclusionsManagerView