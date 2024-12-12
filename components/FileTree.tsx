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
}

const FileTree: React.FC<FileTreeProps> = ({ tree, onSelectFiles }) => {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [collapsedPaths, setCollapsedPaths] = useState<string[]>([]);

  // On initial load, collapse all directories for faster initial rendering.
  useEffect(() => {
    const allDirs = getAllDirectories(tree);
    setCollapsedPaths(allDirs);
  }, [tree]);

  const handleToggleSelect = (node: FileNode) => {
    let newSelected = [...selectedPaths];
    if (node.type === 'directory' && node.children) {
      const allChildFiles = getAllChildFiles(node.children);
      const anyUnselected = allChildFiles.some(f => !newSelected.includes(f));
      if (anyUnselected) {
        for (const f of allChildFiles) {
          if (!newSelected.includes(f)) newSelected.push(f);
        }
      } else {
        newSelected = newSelected.filter(p => !allChildFiles.includes(p));
      }
    } else {
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
    const renderNodes = (nodes: FileNode[]) => {
      return (
        <ul className="list-none pl-5 text-sm">
          {nodes.map(node => {
            const isSelected = node.type === 'file' 
              ? selectedPaths.includes(node.relativePath) 
              : areAllChildrenSelected(node, selectedPaths);
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
    return renderNodes(tree);
  }, [tree, selectedPaths, collapsedPaths]);

  return <div>{renderTree}</div>;
};

export default React.memo(FileTree);

// Helper functions
function getAllChildFiles(nodes: FileNode[]): string[] {
  let files: string[] = [];
  for (const n of nodes) {
    if (n.type === 'file') {
      files.push(n.relativePath);
    } else if (n.children) {
      files = files.concat(getAllChildFiles(n.children));
    }
  }
  return files;
}

function areAllChildrenSelected(node: FileNode, selectedPaths: string[]): boolean {
  if (node.type === 'file') return selectedPaths.includes(node.relativePath);
  if (node.children) {
    return getAllChildFiles(node.children).every(f => selectedPaths.includes(f));
  }
  return false;
}

// New helper to get all directories' paths for initial collapse
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
