// views/CopyButtonView.tsx
import React, { useRef, useState, useEffect } from 'react'
import { Copy, CheckCircle, ClipboardCopy, FileCode } from 'lucide-react'

// shadcn/ui
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'

interface FileNode {
  name: string
  relativePath: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileData {
  path: string
  content: string
  tokenCount: number
}

interface CopyButtonProps {
  metaPrompt: string
  mainInstructions: string
  selectedFiles: string[]
  filesData: FileData[]
  tree: FileNode[]
  excludedPaths: string[]
  filterExtensions: string[]
  onFetchLatestFileData: () => Promise<FileData[]>
}

/**
 * A simple token estimator that splits the text on whitespace and common punctuation.
 * This mimics our backend's approach for a naive token count.
 * @param text The input string to count tokens for.
 * @returns The estimated token count.
 */
function estimateTokenCount(text: string): number {
  const tokens = text.trim().split(/\s+|[,.;:!?()\[\]{}'"<>]/).filter(token => token.length > 0)
  const specialChars = (text.match(/[,.;:!?()\[\]{}'"<>]/g) || []).length
  return tokens.length + specialChars
}

/**
 * Generates a textual representation of a file tree.
 */
function generateTextualTree(
  tree: FileNode[],
  excludedPaths: string[],
  filterExtensions: string[],
  depth: number = 0
): string {
  let result = ''
  const indent = '  '.repeat(depth)

  const filtered = tree.filter(node => {
    if (
      excludedPaths.some(
        ignored => node.relativePath === ignored || node.relativePath.startsWith(ignored + '/')
      )
    ) {
      return false
    }
    return nodeMatchesExtensions(node, filterExtensions)
  })

  for (const node of filtered) {
    const icon = node.type === 'directory' ? '📁' : '📄'
    result += `${indent}${icon} ${node.name}\n`
    if (node.type === 'directory' && node.children) {
      result += generateTextualTree(
        node.children,
        excludedPaths,
        filterExtensions,
        depth + 1
      )
    }
  }
  return result
}

function nodeMatchesExtensions(node: FileNode, extensions: string[]): boolean {
  if (extensions.length === 0) return true
  if (node.type === 'directory') {
    if (!node.children) return false
    return node.children.some(child => nodeMatchesExtensions(child, extensions))
  } else {
    return extensions.some(ext =>
      node.name.toLowerCase().endsWith(ext.toLowerCase())
    )
  }
}

const CopyButtonView: React.FC<CopyButtonProps> = ({
  metaPrompt,
  mainInstructions,
  selectedFiles,
  filesData,
  tree,
  excludedPaths,
  filterExtensions,
  onFetchLatestFileData
}) => {
  const hiddenTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  // Local state to hold the latest file data, so token counts update immediately when refreshed.
  const [localFilesData, setLocalFilesData] = useState<FileData[]>(filesData)

  // Update local state if props.filesData changes
  useEffect(() => {
    setLocalFilesData(filesData)
  }, [filesData])

  // Calculate file tokens and add tokens from meta prompt and main instructions.
  const fileTokens = localFilesData.reduce((acc, file) => acc + (file.tokenCount || 0), 0)
  const metaTokens = estimateTokenCount(metaPrompt)
  const mainTokens = estimateTokenCount(mainInstructions)
  const totalTokens = fileTokens + metaTokens + mainTokens

  const totalChars = localFilesData.reduce((acc, file) => acc + file.content.length, 0)
  const selectedFileCount = selectedFiles.filter(f => !f.endsWith('/')).length

  const handleCopy = async () => {
    setIsLoading(true)
    try {
      const freshFilesData = await onFetchLatestFileData()
      // Update local file data so that token counts refresh immediately.
      setLocalFilesData(freshFilesData)
      
      let combined = ''

      if (metaPrompt.trim()) {
        combined += `# Meta Prompt:\n${metaPrompt}\n\n`
      }
      if (mainInstructions.trim()) {
        combined += `# Main Instructions:\n${mainInstructions}\n\n`
      }

      const treeText = generateTextualTree(tree, excludedPaths, filterExtensions)
      if (treeText.trim()) {
        combined += `# Project Tree:\n${treeText}\n\n`
      }

      if (freshFilesData.length > 0) {
        combined += `# Selected Files:\n`
        for (const f of freshFilesData) {
          combined += `## File: ${f.path}\n${f.content}\n\n`
        }
      }

      try {
        await navigator.clipboard.writeText(combined)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 3000)
      } catch {
        fallbackCopyMethod(combined)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fallbackCopyMethod = (text: string) => {
    if (!hiddenTextAreaRef.current) return
    hiddenTextAreaRef.current.value = text
    hiddenTextAreaRef.current.select()
    try {
      document.execCommand('copy')
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 3000)
    } catch (err) {
      alert('Failed to copy to clipboard!')
    }
  }

  const isReady = selectedFiles.length > 0 || metaPrompt.trim() || mainInstructions.trim()

  return (
    <div className="relative w-full">
      <textarea
        ref={hiddenTextAreaRef}
        className="fixed -top-96 left-0 opacity-0"
        readOnly
        aria-hidden="true"
      />
      
      <div className="space-y-4">
        {/* Stats display */}
        {selectedFileCount > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
              <FileCode size={14} className="mr-1" />
              {selectedFileCount} file{selectedFileCount !== 1 ? 's' : ''}
            </Badge>
            
            <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800">
              <span className="font-mono">{totalTokens.toLocaleString()}</span> tokens
            </Badge>
            
            <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800">
              <span className="font-mono">{totalChars.toLocaleString()}</span> chars
            </Badge>
          </div>
        )}
      
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="default"
                  className={cn(
                    "w-full h-12 flex items-center justify-center gap-2 text-base font-medium relative overflow-hidden transition-all duration-300",
                    copySuccess ? "bg-teal-500 hover:bg-teal-600" : "bg-indigo-500 hover:bg-indigo-600",
                    !isReady && "opacity-70 cursor-not-allowed"
                  )}
                  onClick={handleCopy}
                  disabled={!isReady || isLoading}
                >
                  <div className={cn(
                    "flex items-center justify-center gap-2 transition-transform duration-300",
                    copySuccess ? "transform -translate-y-10" : ""
                  )}>
                    {isLoading ? (
                      <ClipboardCopy size={18} className="animate-spin" />
                    ) : (
                      <Copy size={18} className={copySuccess ? "opacity-0" : "opacity-100 transition-opacity duration-300"} />
                    )}
                    <span>{isLoading ? "Processing..." : "Copy All to Clipboard"}</span>
                  </div>
                  
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center gap-2 text-white transition-transform duration-300",
                    copySuccess ? "transform translate-y-0" : "transform translate-y-10"
                  )}>
                    <CheckCircle size={18} />
                    <span>Copied to Clipboard!</span>
                  </div>
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {!isReady ? (
                <p>Please select files or add instructions first</p>
              ) : (
                <p>Copy all content to clipboard</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

export default CopyButtonView
