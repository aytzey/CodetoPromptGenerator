// views/CopyButtonView.tsx

import React, { useRef, useState } from 'react'
import { Copy } from 'lucide-react'  // <-- Make sure this is added
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
    // Re-fetch fresh file contents
    const freshFilesData = await onFetchLatestFileData()

    // Build combined text
    let combined = ''
    if (metaPrompt.trim()) {
      combined += `# Meta Prompt:\n${metaPrompt}\n\n`
    }
    if (mainInstructions.trim()) {
      combined += `# Main Instructions:\n${mainInstructions}\n\n`
    }

    // Tree
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

/** Helper that generates textual project tree. Reuse your existing logic. */
function generateTextualTree(
  tree: FileNode[],
  excludedPaths: string[],
  filterExtensions: string[],
  depth: number = 0
): string {
  let result = ''
  const indent = '  '.repeat(depth)
  const filtered = tree.filter(node => {
    // exclude
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
      result += generateTextualTree(node.children, excludedPaths, filterExtensions, depth + 1)
    }
  }
  return result
}

function nodeMatchesExtensions(node: FileNode, extensions: string[]): boolean {
  if (extensions.length === 0) return true
  if (node.type === 'directory') {
    return node.children
      ? node.children.some(child => nodeMatchesExtensions(child, extensions))
      : false
  } else {
    return extensions.some(ext => node.name.toLowerCase().endsWith(ext.toLowerCase()))
  }
}
