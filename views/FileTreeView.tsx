// views/FileTreeView.tsx

import React, { useState, useMemo } from 'react'

/**
 * Represents a node in the file tree.
 */
export interface FileNode {
  name: string
  relativePath: string
  absolutePath: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  /**
   * The entire file tree (from the backend).
   */
  tree: FileNode[]
  /**
   * Callback to update the parent with the newly selected *relative* paths.
   */
  onSelectFiles: (paths: string[]) => void
  /**
   * Optional file extension filter, e.g. ['.ts', '.js'].
   */
  filterExtensions?: string[]
}

/**
 * A file tree component that:
 * - Toggles only the clicked node (file or directory).
 * - When a directory is selected/deselected, all its sub-items also get toggled.
 * - Passes the node's *relative* path(s) to the parent.
 */
const FileTreeView: React.FC<FileTreeProps> = ({
  tree,
  onSelectFiles,
  filterExtensions = [],
}) => {
  /**
   * Set of currently selected *relative* paths.
   */
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])

  /**
   * Which directories are collapsed in the UI (by absolute path).
   */
  const [collapsedDirs, setCollapsedDirs] = useState<string[]>([])

  // Filter tree nodes if file extensions are provided
  const filteredTree = useMemo(() => filterTree(tree, filterExtensions), [
    tree,
    filterExtensions,
  ])

  /**
   * Toggle a single node's selection (file or directory) AND:
   *   - If it's a directory, toggle all of its children accordingly.
   */
  const handleToggleSelection = (node: FileNode) => {
    const newSelected = new Set(selectedPaths)

    // CHANGED: Get all children paths, including the directory itself
    const allPaths = getAllDescendantPaths(node)

    // Check if the directory (or file) was already selected
    const isSelected = allPaths.every(path => newSelected.has(path))

    if (isSelected) {
      // If everything is selected, we remove them
      allPaths.forEach(p => newSelected.delete(p)) // CHANGED
    } else {
      // Otherwise, add them
      allPaths.forEach(p => newSelected.add(p)) // CHANGED
    }

    const updatedPaths = Array.from(newSelected)
    setSelectedPaths(updatedPaths)
    onSelectFiles(updatedPaths) // pass up
  }

  /**
   * Expand or collapse a directory in the UI.
   */
  const handleCollapseToggle = (node: FileNode) => {
    if (node.type !== 'directory') return
    const dirKey = node.absolutePath
    setCollapsedDirs(prev =>
      prev.includes(dirKey)
        ? prev.filter(x => x !== dirKey) // expand
        : [...prev, dirKey] // collapse
    )
  }

  /**
   * Recursively render file/directory nodes with checkboxes + expand/collapse icons.
   */
  const renderNodes = (nodes: FileNode[], depth: number = 0) => {
    return (
      <ul className="list-none">
        {nodes.map(node => {
          // CHANGED: Instead of checking single node, we check if *all* descendants are selected
          const allDescendants = getAllDescendantPaths(node)
          const isSelected = allDescendants.every(path => selectedPaths.includes(path))

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

              {/* If directory has children and isn't collapsed, render them recursively */}
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

  return <div className="text-sm text-gray-100">{renderNodes(filteredTree)}</div>
}

export default React.memo(FileTreeView)

/**
 * Recursively filter the tree by file extension if provided.
 * We keep directories if they contain at least one valid child.
 */
function filterTree(nodes: FileNode[], exts: string[]): FileNode[] {
  if (exts.length === 0) return nodes

  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.type === 'directory') {
      const filteredChildren = node.children ? filterTree(node.children, exts) : []
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }
    } else {
      if (matchesExtension(node.name, exts)) {
        result.push(node)
      }
    }
  }
  return result
}

/**
 * Returns true if filename ends with any extension in 'exts'.
 */
function matchesExtension(filename: string, exts: string[]): boolean {
  const lower = filename.toLowerCase()
  return exts.some(ext => lower.endsWith(ext.toLowerCase()))
}

// CHANGED: New helper function that returns all descendant paths (including the current node)
function getAllDescendantPaths(node: FileNode): string[] {
  const paths: string[] = []

  // DFS approach
  const stack: FileNode[] = [node]

  while (stack.length > 0) {
    const current = stack.pop()!
    paths.push(current.relativePath)

    if (current.type === 'directory' && current.children) {
      for (const child of current.children) {
        stack.push(child)
      }
    }
  }

  return paths
}
