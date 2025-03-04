// views/FileTreeView.tsx
import React, { useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, MinusSquare, PlusSquare } from 'lucide-react'

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

/**
 * A node in the file tree: can be file or directory. 
 * Typically provided by the parent after server-side scanning.
 */
export interface FileNode {
  name: string
  relativePath: string
  absolutePath: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  /** Already-filtered file tree from the parent. */
  tree: FileNode[]
  /** The parent's array of selected file paths. */
  selectedFiles: string[]
  /** Callback to update the parent's selectedFiles list. */
  onSelectFiles: (paths: string[]) => void
}

/**
 * A collapsible file tree with checkboxes. Searching & extension filtering happen upstream;
 * we only handle collapsible directories and toggling selection here.
 */
const FileTreeView: React.FC<FileTreeProps> = ({ tree, selectedFiles, onSelectFiles }) => {
  // Tracks which directories are collapsed
  const [collapsedDirs, setCollapsedDirs] = useState<string[]>([])

  /**
   * Expand or collapse a directory's children.
   */
  const handleCollapseToggle = (node: FileNode) => {
    if (node.type !== 'directory') return
    const dirKey = node.absolutePath
    setCollapsedDirs(prev =>
      prev.includes(dirKey) ? prev.filter(x => x !== dirKey) : [...prev, dirKey]
    )
  }

  /**
   * When the user clicks the checkbox for a node, we either:
   * - Add all descendant files to the selection, or
   * - Remove them if they're already all selected.
   */
  const handleToggleSelection = (node: FileNode) => {
    const allPaths = getAllDescendantPaths(node)
    const newSet = new Set(selectedFiles)

    // Are all of this node's descendant paths *already* in selectedFiles?
    const isFullySelected = allPaths.every(p => newSet.has(p))

    if (isFullySelected) {
      // Unselect all paths under this node
      allPaths.forEach(p => newSet.delete(p))
    } else {
      // Select all
      allPaths.forEach(p => newSet.add(p))
    }

    onSelectFiles(Array.from(newSet))
  }

  /**
   * Expand all directories in the current tree.
   */
  const expandAll = () => {
    // No collapsed directories
    setCollapsedDirs([])
  }

  /**
   * Collapse all directories in the current tree.
   */
  const collapseAll = () => {
    const allDirs = getAllDirectories(tree)
    setCollapsedDirs(allDirs)
  }

  // Count total files and directories
  const { fileCount, dirCount } = countFilesAndDirs(tree)

  /**
   * Render nodes recursively.
   */
  const renderNodes = (nodes: FileNode[], depth = 0) => {
    return (
      <ul className="space-y-1 list-none">
        {nodes.map(node => {
          const allDescendants = getAllDescendantPaths(node)
          const isSelected = allDescendants.every(path => selectedFiles.includes(path))
          const isPartiallySelected = !isSelected && allDescendants.some(path => selectedFiles.includes(path))
          const isCollapsed =
            node.type === 'directory' && collapsedDirs.includes(node.absolutePath)

          // Count children if it's a directory
          let childCount = 0
          if (node.type === 'directory' && node.children) {
            childCount = node.children.length
          }

          return (
            <li key={node.absolutePath} className="mb-1">
              <div
                className={`
                  flex items-center px-1 py-1 rounded transition-colors
                  ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                `}
                style={{ paddingLeft: `${depth * 1.2}rem` }}
              >
                {node.type === 'directory' ? (
                  <button
                    className="mr-1 p-0.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onClick={e => {
                      e.stopPropagation()
                      handleCollapseToggle(node)
                    }}
                  >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                ) : (
                  <span className="mr-2 inline-block w-6" />
                )}

                <div
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={e => {
                    e.stopPropagation()
                    handleToggleSelection(node)
                  }}
                >
                  <Checkbox 
                    id={`checkbox-${node.absolutePath}`}
                    checked={isSelected}
                    data-state={isPartiallySelected ? "indeterminate" : isSelected ? "checked" : "unchecked"}
                    onCheckedChange={() => handleToggleSelection(node)}
                    className={`
                      data-[state=checked]:bg-indigo-500 
                      data-[state=checked]:text-white 
                      data-[state=indeterminate]:bg-indigo-300
                      data-[state=indeterminate]:text-white
                      dark:data-[state=indeterminate]:bg-indigo-700
                    `}
                  />
                  <span
                    className={`
                      flex items-center gap-1.5 transition-colors
                      ${isSelected ? 'font-medium' : ''}
                      ${node.type === 'directory' 
                        ? 'text-amber-600 dark:text-amber-500' 
                        : 'text-teal-600 dark:text-teal-500'}
                    `}
                  >
                    {node.type === 'directory' ? (
                      <Folder size={16} className="text-amber-500 dark:text-amber-400 opacity-80" />
                    ) : (
                      <File size={16} className="text-teal-500 dark:text-teal-400 opacity-80" />
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-xs text-gray-900 dark:text-gray-200">
                            {node.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-gray-800 text-white dark:bg-gray-700 max-w-sm">
                          <p className="font-mono text-xs">{node.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {node.type === 'directory' && childCount > 0 && (
                      <Badge variant="outline" className="ml-1 text-xs py-0 px-1.5 h-4 font-normal text-gray-500 dark:text-gray-400 bg-transparent">
                        {childCount}
                      </Badge>
                    )}
                  </span>
                </div>
              </div>
              {node.type === 'directory' && node.children && !isCollapsed && (
                <div className="ml-3 border-l border-gray-200 dark:border-gray-700">
                  {renderNodes(node.children, depth + 1)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="text-sm space-y-3">
      {/* Expand/Collapse controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={expandAll}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            <PlusSquare className="mr-1 h-3.5 w-3.5" />
            Expand All
          </Button>
          <Button
            onClick={collapseAll}
            variant="outline"
            size="sm"
            className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            <MinusSquare className="mr-1 h-3.5 w-3.5" />
            Collapse All
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800">
            {fileCount} files
          </Badge>
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            {dirCount} folders
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[350px] pr-4">
        {tree.length > 0 ? (
          renderNodes(tree)
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400">
            <Folder size={40} className="mb-2 opacity-50" />
            <p>No files to display</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default React.memo(FileTreeView)

/** ----------------
 * Utility Functions
 * ---------------- */

/**
 * Collects the absolutePath of all directories in the subtree.
 */
function getAllDirectories(nodes: FileNode[]): string[] {
  const dirs: string[] = []
  for (const node of nodes) {
    if (node.type === 'directory') {
      dirs.push(node.absolutePath)
      if (node.children) {
        dirs.push(...getAllDirectories(node.children))
      }
    }
  }
  return dirs
}

/**
 * Return a list of all descendant paths under the given node (including the node itself).
 */
function getAllDescendantPaths(node: FileNode): string[] {
  const stack: FileNode[] = [node]
  const paths: string[] = []

  while (stack.length > 0) {
    const current = stack.pop()!
    paths.push(current.relativePath)

    if (current.type === 'directory' && current.children) {
      stack.push(...current.children)
    }
  }
  return paths
}

/**
 * Count total files and directories in the tree
 */
function countFilesAndDirs(nodes: FileNode[]): { fileCount: number, dirCount: number } {
  let fileCount = 0
  let dirCount = 0
  
  function count(nodeList: FileNode[]) {
    for (const node of nodeList) {
      if (node.type === 'file') {
        fileCount++
      } else {
        dirCount++
        if (node.children) {
          count(node.children)
        }
      }
    }
  }
  
  count(nodes)
  return { fileCount, dirCount }
}