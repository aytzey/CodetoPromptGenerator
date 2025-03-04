// views/CopyButtonView.tsx

import React, { useRef, useState } from 'react'
import { Copy } from 'lucide-react'

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
 * Gathers all relevant data (meta prompt, instructions, project tree, file contents)
 * and copies them to the clipboard in a single text block.
 */
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

  const handleCopy = async () => {
    // Re-fetch fresh file contents, ensuring the user gets the latest data
    const freshFilesData = await onFetchLatestFileData()

    // Build combined text
    let combined = ''
    if (metaPrompt.trim()) {
      combined += `# Meta Prompt:\n${metaPrompt}\n\n`
    }
    if (mainInstructions.trim()) {
      combined += `# Main Instructions:\n${mainInstructions}\n\n`
    }

    // Generate textual project tree
    const treeText = generateTextualTree(tree, excludedPaths, filterExtensions)
    if (treeText.trim()) {
      combined += `# Project Tree:\n${treeText}\n\n`
    }

    // Files
    if (freshFilesData.length > 0) {
      combined += `# Selected Files:\n`
      for (const f of freshFilesData) {
        combined += `## File: ${f.path}\n${f.content}\n\n`
      }
    }

    // Attempt to copy
    try {
      await navigator.clipboard.writeText(combined)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      // Fallback
      fallbackCopyMethod(combined)
    }
  }

  /**
   * Some browsers or older setups might not support navigator.clipboard.
   * Fallback to using a hidden textarea + document.execCommand('copy').
   */
  const fallbackCopyMethod = (text: string) => {
    if (!hiddenTextAreaRef.current) return
    hiddenTextAreaRef.current.value = text
    hiddenTextAreaRef.current.select()

    try {
      document.execCommand('copy')
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      alert('Failed to copy to clipboard!')
    }
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={hiddenTextAreaRef}
        className="fixed -top-96 left-0 opacity-0"
        readOnly
        aria-hidden="true"
      />

      <button
        onClick={handleCopy}
        className="w-full px-5 py-3 bg-gradient-to-r from-[#50fa7b] to-[#8be9fd] hover:from-[#8be9fd] hover:to-[#50fa7b] text-[#141527] font-bold rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg"
      >
        <Copy size={20} />
        <span>Copy All to Clipboard</span>
      </button>

      {copySuccess && (
        <div className="absolute top-0 left-0 right-0 text-center mt-2 animate-fadeIn">
          <span className="inline-block bg-[#50fa7b] text-[#141527] px-3 py-1 rounded shadow">
            Copied!
          </span>
        </div>
      )}
    </div>
  )
}

export default CopyButtonView

/**
 * Recursively generate a textual version of the project tree,
 * respecting excluded paths and extension filters.
 */
function generateTextualTree(
  tree: FileNode[],
  excludedPaths: string[],
  filterExtensions: string[],
  depth: number = 0
): string {
  let result = ''
  const indent = '  '.repeat(depth)

  // Filter out nodes that are in excluded paths or don't match the extension filter
  const filtered = tree.filter(node => {
    if (
      excludedPaths.some(
        ignored => node.relativePath === ignored || node.relativePath.startsWith(ignored + '/')
      )
    ) {
      // Exclude anything under an ignored directory
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
    // Keep the directory if any child matches
    return node.children.some(child => nodeMatchesExtensions(child, extensions))
  } else {
    return extensions.some(ext => node.name.toLowerCase().endsWith(ext.toLowerCase()))
  }
}
