// views/InstructionsInputView.tsx
import React from 'react'
import { Save, RefreshCw, FileText, Download, Upload, Edit3 } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

interface InstructionsInputProps {
  metaPrompt: string
  setMetaPrompt: (v: string) => void
  mainInstructions: string
  setMainInstructions: (v: string) => void
  metaPromptFiles: string[]
  selectedMetaFile: string
  setSelectedMetaFile: (v: string) => void
  onLoadMetaPrompt: () => void
  onSaveMetaPrompt: () => void
  newMetaFileName: string
  setNewMetaFileName: (v: string) => void
  onRefreshMetaList: () => void
}

const MAX_CHARS = 1000

/**
 * UI for editing meta-prompt instructions and main instructions,
 * plus selecting or saving them to a .txt file on disk.
 */
const InstructionsInputView: React.FC<InstructionsInputProps> = ({
  metaPrompt,
  setMetaPrompt,
  mainInstructions,
  setMainInstructions,
  metaPromptFiles,
  selectedMetaFile,
  setSelectedMetaFile,
  onLoadMetaPrompt,
  onSaveMetaPrompt,
  newMetaFileName,
  setNewMetaFileName,
  onRefreshMetaList
}) => {
  const metaCount = metaPrompt.length
  const mainCount = mainInstructions.length

  const metaPercentage = Math.min(100, (metaCount / MAX_CHARS) * 100)
  const mainPercentage = Math.min(100, (mainCount / MAX_CHARS) * 100)

  const getProgressColor = (count: number) => {
    if (count > MAX_CHARS) return "bg-rose-500"
    if (count > MAX_CHARS * 0.9) return "bg-amber-500"
    return "bg-indigo-500"
  }

  const getCounterColor = (count: number) => {
    if (count > MAX_CHARS) return "text-rose-500 dark:text-rose-400"
    if (count > MAX_CHARS * 0.9) return "text-amber-500 dark:text-amber-400"
    return "text-gray-500 dark:text-gray-400"
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400 flex items-center">
        <Edit3 className="mr-2 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        Prompts
      </h3>

      {/* Meta Prompt Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Meta Prompt File
        </Label>
        <div className="flex gap-2">
          <Select 
            value={selectedMetaFile || "none"} 
            onValueChange={(value) => setSelectedMetaFile(value === "none" ? "" : value)}
          >
            <SelectTrigger className="flex-grow bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Select a saved prompt" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
              <SelectItem value="none">--None--</SelectItem>
              {metaPromptFiles.map(file => (
                <SelectItem key={file} value={file} className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {file}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onLoadMetaPrompt}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  disabled={!selectedMetaFile}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Load
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Load the selected prompt file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onRefreshMetaList}
                  variant="outline"
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Refresh the list of saved prompts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Save meta prompt */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Save Current Prompt
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              value={newMetaFileName}
              onChange={e => setNewMetaFileName(e.target.value)}
              placeholder="prompt_name.txt"
              className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onSaveMetaPrompt}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  disabled={!metaPrompt.trim()}
                >
                  <Save className="mr-1 h-4 w-4" />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Save the current prompt to a file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Meta Prompt Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Meta Prompt:
          </Label>
          <span className={`text-xs font-mono ${getCounterColor(metaCount)}`}>
            {metaCount} / {MAX_CHARS}
          </span>
        </div>
        <Textarea
          value={metaPrompt}
          onChange={e => setMetaPrompt(e.target.value)}
          className="min-h-20 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          placeholder="Enter meta prompt instructions..."
        />
        <Progress 
          value={metaPercentage} 
          className={`h-1 ${getProgressColor(metaCount)}`} 
        />
      </div>

      {/* Main Instructions */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Main Instructions:
          </Label>
          <span className={`text-xs font-mono ${getCounterColor(mainCount)}`}>
            {mainCount} / {MAX_CHARS}
          </span>
        </div>
        <Textarea
          value={mainInstructions}
          onChange={e => setMainInstructions(e.target.value)}
          className="min-h-32 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          placeholder="Enter your main instructions here..."
        />
        <Progress 
          value={mainPercentage} 
          className={`h-1 ${getProgressColor(mainCount)}`} 
        />
      </div>
    </div>
  )
}

export default InstructionsInputView