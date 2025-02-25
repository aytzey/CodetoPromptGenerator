// views/CopyButtonView.tsx

import React, { useRef } from 'react'

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
  /**
   * NEW: Callback to re-fetch the latest file content from the backend
   * so we have fresh data each time we copy.
   */
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
  onFetchLatestFileData, // <-- NEW
}) => {
  const hiddenTextAreaRef = useRef<HTMLTextAreaElement | null>(null)

  /**
   * CHANGED: make handleCopy async, call onFetchLatestFileData() to refresh contents
   */
  const handleCopy = async () => {
    // 1) Re-fetch from the backend to ensure we have the latest
    const freshFilesData = await onFetchLatestFileData()

    // 2) Build the combined text from the newly fetched data
    let combined = ''

    // Write meta prompt
    if (metaPrompt.trim()) {
      combined += `# Meta Prompt:\n${metaPrompt}\n\n`
    }

    // Write main instructions
    if (mainInstructions.trim()) {
      combined += `# Main Instructions:\n${mainInstructions}\n\n`
    }

    // Write textual project tree
    const treeText = generateTextualTree(tree, excludedPaths, filterExtensions)
    if (treeText.trim()) {
      combined += `# Project Tree:\n${treeText}\n\n`
    }

    // Write file contents from *freshly fetched* data
    if (freshFilesData.length > 0) {
      combined += `# Selected Files:\n`
      for (const f of freshFilesData) {
        combined += `## File: ${f.path}\n${f.content}\n\n`
      }
    }

    // Try using the Clipboard API
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(combined)
        .then(() => {
          alert('Copied to clipboard!')
        })
        .catch(err => {
          console.warn('Clipboard API failed, switching to fallback:', err)
          fallbackCopyMethod(combined)
        })
    } else {
      fallbackCopyMethod(combined)
    }
  }

  const fallbackCopyMethod = (textToCopy: string) => {
    if (hiddenTextAreaRef.current) {
      hiddenTextAreaRef.current.value = textToCopy
      hiddenTextAreaRef.current.select()

      try {
        document.execCommand('copy')
        alert('Copied to clipboard (fallback method)!')
      } catch (err2) {
        console.error('Clipboard copy failed:', err2)
        alert('Failed to copy!')
      }
    }
  }

  return (
    <>
      {/* Hidden TextArea for fallback copying */}
      <textarea
        ref={hiddenTextAreaRef}
        style={{
          position: 'fixed',
          top: '-1000px',
          left: '-1000px',
          opacity: 0,
        }}
        readOnly
        aria-hidden="true"
      />

      <button
        onClick={handleCopy}
        className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium"
      >
        Copy All to Clipboard
      </button>
    </>
  )
}

export default CopyButtonView

/**
 * Produce a textual tree of your project,
 * respecting excluded paths and extension filters
 */
function generateTextualTree(
  tree: FileNode[],
  excludedPaths: string[],
  filterExtensions: string[],
  depth: number = 0
): string {
  let result = ''
  const indent = '  '.repeat(depth)

  const filteredNodes = tree.filter(node => {
    // If node's relativePath is in excludedPaths, skip it
    if (
      excludedPaths.some(
        ignored =>
          node.relativePath === ignored ||
          node.relativePath.startsWith(ignored + '/')
      )
    ) {
      return false
    }
    // If it's a directory or file that doesn't match the extension filter, skip
    return nodeMatchesExtensions(node, filterExtensions)
  })

  for (const node of filteredNodes) {
    const icon = node.type === 'directory' ? '📁' : '📄'
    result += `${indent}${icon} ${node.name}\n`
    if (node.children && node.children.length > 0) {
      result += generateTextualTree(node.children, excludedPaths, filterExtensions, depth + 1)
    }
  }
  return result
}

function nodeMatchesExtensions(node: FileNode, extensions: string[]): boolean {
  if (extensions.length === 0) return true
  if (node.type === 'directory') {
    // Keep directories if they have any child that matches
    return node.children
      ? node.children.some(child => nodeMatchesExtensions(child, extensions))
      : false
  } else {
    return matchesAnyExtension(node.name, extensions)
  }
}

function matchesAnyExtension(fileNameOrPath: string, extensions: string[]): boolean {
  if (extensions.length === 0) return true
  const lowerName = fileNameOrPath.toLowerCase()
  return extensions.some(ext => lowerName.endsWith(ext.toLowerCase()))
}
