import React, { useState, useEffect, useMemo } from 'react';

interface FileNode {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileTreeProps {
  tree: FileNode[];
  onSelectFiles: (selectedFiles: string[]) => void;
  filterExtensions?: string[];
}

const FileTree: React.FC<FileTreeProps> = ({ tree, onSelectFiles, filterExtensions = [] }) => {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [collapsedPaths, setCollapsedPaths] = useState<string[]>([]);

  useEffect(() => {
    const allDirs = getAllDirectories(tree);
    setCollapsedPaths(allDirs);
  }, [tree]);

  const handleToggleSelect = (node: FileNode) => {
    let newSelected = [...selectedPaths];

    if (node.type === 'directory') {
      const allChildPaths = getAllChildPaths(node, filterExtensions);

      // Determine if we need to add or remove them
      const anyUnselected = allChildPaths.some(p => !newSelected.includes(p));
      if (anyUnselected) {
        for (const p of allChildPaths) {
          if (!newSelected.includes(p)) newSelected.push(p);
        }
      } else {
        // Remove all children paths
        newSelected = newSelected.filter(p => !allChildPaths.includes(p));
      }

      // Also toggle the directory itself
      if (anyUnselected) {
        if (!newSelected.includes(node.relativePath)) {
          newSelected.push(node.relativePath);
        }
      } else {
        // removing
        newSelected = newSelected.filter(p => p !== node.relativePath);
      }

    } else {
      // File
      if (newSelected.includes(node.relativePath)) {
        newSelected = newSelected.filter(p => p !== node.relativePath);
      } else {
        newSelected.push(node.relativePath);
      }
    }

    setSelectedPaths(newSelected);
    onSelectFiles(newSelected);
  };

  const handleToggleCollapse = (node: FileNode) => {
    if (node.type === 'directory') {
      if (collapsedPaths.includes(node.relativePath)) {
        setCollapsedPaths(collapsedPaths.filter(p => p !== node.relativePath));
      } else {
        setCollapsedPaths([...collapsedPaths, node.relativePath]);
      }
    }
  };

  const renderTree = useMemo(() => {
    const filteredTree = filterNodes(tree, filterExtensions);

    const renderNodes = (nodes: FileNode[]) => {
      return (
        <ul className="list-none pl-5 text-sm">
          {nodes.map(node => {
            const isSelected = isNodeSelected(node, selectedPaths, filterExtensions);
            const isCollapsed = node.type === 'directory' && collapsedPaths.includes(node.relativePath);

            return (
              <li key={node.relativePath} className="mb-1">
                <div className="flex items-center">
                  {node.type === 'directory' ? (
                    <span 
                      className="cursor-pointer mr-2 text-gray-300 hover:text-gray-100"
                      onClick={() => handleToggleCollapse(node)}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                  ) : (
                    <span className="mr-2 inline-block w-3" />
                  )}
                  <label className="cursor-pointer select-none flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(node)}
                      className="text-blue-600 bg-gray-700 border-gray-600 rounded"
                    />
                    <span className={node.type === 'directory' ? "text-yellow-400" : "text-green-400"}>
                      {node.type === 'directory' ? '📁' : '📄'}
                    </span>
                    <span className="hover:text-white">{node.name}</span>
                  </label>
                </div>
                {node.children && !isCollapsed && (
                  <div className="pl-4 border-l border-gray-700 mt-1">
                    {renderNodes(node.children)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      );
    };
    return renderNodes(filteredTree);
  }, [tree, selectedPaths, collapsedPaths, filterExtensions]);

  return <div>{renderTree}</div>;
};

export default React.memo(FileTree);

// Helper functions
function getAllChildPaths(node: FileNode, filterExtensions: string[]): string[] {
  // If no filter: include all directories and files
  // If filter: include only matched files and directories that eventually contain matched files

  const paths: string[] = [];

  // If no extensions, we include directories too
  if (filterExtensions.length === 0) {
    // Add all descendants (files and directories)
    addAllDescendants(node, paths);
  } else {
    // Add only matched files (directories are just containers, we don't add them if filter applied)
    addMatchedFiles(node, paths, filterExtensions);
  }

  return paths;
}

function addAllDescendants(node: FileNode, paths: string[]) {
  // Add current node if it's a file or directory
  // We'll rely on handleToggleSelect to add the directory itself
  // Here we just add children.
  if (node.children) {
    for (const child of node.children) {
      paths.push(child.relativePath);
      if (child.type === 'directory') {
        addAllDescendants(child, paths);
      }
    }
  }
}

function addMatchedFiles(node: FileNode, paths: string[], filterExtensions: string[]) {
  if (node.type === 'file') {
    if (matchesExtensionFilter(node, filterExtensions)) {
      paths.push(node.relativePath);
    }
  } else if (node.children) {
    for (const child of node.children) {
      addMatchedFiles(child, paths, filterExtensions);
    }
  }
}

function isNodeSelected(node: FileNode, selectedPaths: string[], filterExtensions: string[]): boolean {
  if (node.type === 'file') return selectedPaths.includes(node.relativePath);
  
  // Directory
  // Directory is considered selected if it's in the selectedPaths
  return selectedPaths.includes(node.relativePath);
}

function getAllDirectories(nodes: FileNode[]): string[] {
  let dirs: string[] = [];
  for (const n of nodes) {
    if (n.type === 'directory') {
      dirs.push(n.relativePath);
      if (n.children) {
        dirs = dirs.concat(getAllDirectories(n.children));
      }
    }
  }
  return dirs;
}

// Filter nodes by extension
function filterNodes(nodes: FileNode[], extensions: string[]): FileNode[] {
  if (extensions.length === 0) return nodes;

  const filtered: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      if (matchesExtensionFilter(node, extensions)) {
        filtered.push(node);
      }
    } else {
      const filteredChildren = node.children ? filterNodes(node.children, extensions) : [];
      if (filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren
        });
      }
    }
  }

  return filtered;
}

function matchesExtensionFilter(node: FileNode, extensions: string[]): boolean {
  if (node.type !== 'file') return false;
  const lowerName = node.name.toLowerCase();
  return extensions.some(ext => lowerName.endsWith(ext.toLowerCase()));
}
