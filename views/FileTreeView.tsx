// views/FileTreeView.tsx

import React, { useState, useMemo, useCallback } from 'react'

export interface FileNode {
  name: string
  relativePath: string
  absolutePath: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  tree: FileNode[]
  onSelectFiles: (paths: string[]) => void
  filterExtensions?: string[]
}

const FileTreeView: React.FC<FileTreeProps> = ({
  tree,
  onSelectFiles,
  filterExtensions = []
}) => {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [collapsedDirs, setCollapsedDirs] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTree = useMemo(() => {
    const baseFiltered = filterTree(tree, filterExtensions)
    if (!searchTerm.trim()) return baseFiltered

    // If searching, only keep nodes that match the name or have descendants that match
    return filterBySearch(baseFiltered, searchTerm.toLowerCase())
  }, [tree, filterExtensions, searchTerm])

  const handleToggleSelection = (node: FileNode) => {
    const newSelected = new Set(selectedPaths)
    const allPaths = getAllDescendantPaths(node)

    // Check if all are selected
    const isSelected = allPaths.every(path => newSelected.has(path))
    if (isSelected) {
      allPaths.forEach(p => newSelected.delete(p))
    } else {
      allPaths.forEach(p => newSelected.add(p))
    }

    const updatedPaths = Array.from(newSelected)
    setSelectedPaths(updatedPaths)
    onSelectFiles(updatedPaths)
  }

  const handleCollapseToggle = (node: FileNode) => {
    if (node.type !== 'directory') return
    const dirKey = node.absolutePath
    setCollapsedDirs(prev =>
      prev.includes(dirKey) ? prev.filter(x => x !== dirKey) : [...prev, dirKey]
    )
  }

  // Expand All or Collapse All
  const expandAll = useCallback(() => {
    // find all directories
    const allDirs = getAllDirectories(filteredTree)
    setCollapsedDirs([]) // no collapsed
  }, [filteredTree])

  const collapseAll = useCallback(() => {
    const allDirs = getAllDirectories(filteredTree)
    setCollapsedDirs(allDirs) // collapse every directory
  }, [filteredTree])

  const renderNodes = (nodes: FileNode[], depth = 0) => {
    return (
      <ul className="list-none">
        {nodes.map(node => {
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
                  <input type="checkbox" checked={isSelected} readOnly className="accent-[#50fa7b]" />
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
      {/* Search + Expand/Collapse Controls */}
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search files..."
          className="flex-1 bg-[#12131C] text-gray-100 border border-[#3f4257] rounded px-2 py-1 focus:outline-none focus:border-[#7b93fd]"
        />
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

      {/* Render Tree */}
      {renderNodes(filteredTree)}
    </div>
  )
}

export default React.memo(FileTreeView)

/** ----------------
 * Utility Functions
 * ---------------- */
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

function matchesExtension(name: string, exts: string[]): boolean {
  const lower = name.toLowerCase()
  return exts.some(ext => lower.endsWith(ext.toLowerCase()))
}

function filterBySearch(nodes: FileNode[], term: string): FileNode[] {
  const results: FileNode[] = []
  for (const node of nodes) {
    const match = node.name.toLowerCase().includes(term)
    if (node.type === 'directory' && node.children) {
      const filteredChildren = filterBySearch(node.children, term)
      if (match || filteredChildren.length > 0) {
        results.push({ ...node, children: filteredChildren })
      }
    } else if (match) {
      results.push({ ...node })
    }
  }
  return results
}

function getAllDescendantPaths(node: FileNode): string[] {
  const paths: string[] = []
  const stack: FileNode[] = [node]
  while (stack.length > 0) {
    const current = stack.pop()!
    paths.push(current.relativePath)
    if (current.type === 'directory' && current.children) {
      stack.push(...current.children)
    }
  }
  return paths
}

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
