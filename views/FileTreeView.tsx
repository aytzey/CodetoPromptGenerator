// views/FileTreeView.tsx
import React, { useState } from 'react'

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
    const allDirs = getAllDirectories(tree)
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

  /**
   * Render nodes recursively.
   */
  const renderNodes = (nodes: FileNode[], depth = 0) => {
    return (
      <ul className="list-none">
        {nodes.map(node => {
          const allDescendants = getAllDescendantPaths(node)
          const isSelected = allDescendants.every(path => selectedFiles.includes(path))
          const isCollapsed =
            node.type === 'directory' && collapsedDirs.includes(node.absolutePath)

          return (
            <li key={node.absolutePath} className="mb-1">
              <div
                className="flex items-center hover:bg-[#2c2f3f] px-1 py-0.5 rounded cursor-pointer"
                style={{ paddingLeft: `${depth * 1.2}rem` }}
              >
                {node.type === 'directory' ? (
                  <span
                    className="mr-2 text-gray-300 hover:text-gray-100"
                    onClick={e => {
                      e.stopPropagation()
                      handleCollapseToggle(node)
                    }}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                ) : (
                  <span className="mr-2 inline-block w-3" />
                )}

                <label
                  className="flex items-center gap-2"
                  onClick={e => {
                    e.stopPropagation()
                    handleToggleSelection(node)
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="accent-[#50fa7b]"
                  />
                  <span
                    className={
                      node.type === 'directory'
                        ? 'text-yellow-400 font-semibold'
                        : 'text-green-400'
                    }
                  >
                    {node.type === 'directory' ? '📁' : '📄'} {node.name}
                  </span>
                </label>
              </div>
              {node.type === 'directory' && node.children && !isCollapsed && (
                <div className="ml-3 border-l border-gray-700">
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
    <div className="text-sm text-gray-100 space-y-3">
      {/* Expand/Collapse controls */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={expandAll}
          className="px-2 py-1 bg-[#50fa7b] hover:bg-[#7b93fd] rounded text-xs text-[#12131C]"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-2 py-1 bg-[#bd93f9] hover:bg-[#ff79c6] rounded text-xs text-[#12131C]"
        >
          Collapse All
        </button>
      </div>

      {renderNodes(tree)}
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
