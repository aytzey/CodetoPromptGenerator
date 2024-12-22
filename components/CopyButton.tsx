// components/CopyButton.tsx

import React from 'react';

interface FileNode {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface CopyButtonProps {
  metaPrompt: string;
  mainInstructions: string;
  selectedFiles: string[];
  fileList: FileList | null;
  tree: FileNode[];
  excludedPaths: string[];
  filterExtensions: string[];
}

const CopyButton: React.FC<CopyButtonProps> = ({
  metaPrompt,
  mainInstructions,
  selectedFiles,
  fileList,
  tree,
  excludedPaths,
  filterExtensions,
}) => {
  const handleCopy = async () => {
    // Filter selected files by extension if necessary
    const filesToCopy = filterExtensions.length > 0
      ? selectedFiles.filter(filePath => matchesAnyExtension(filePath, filterExtensions))
      : selectedFiles;

    // Get latest contents for each file from fileList only
    const filesData = await getLocalFilesContent(filesToCopy, fileList);

    let combined = '';
    if (metaPrompt.trim()) {
      combined += `# Meta Prompt:\n${metaPrompt}\n\n`;
    }
    if (mainInstructions.trim()) {
      combined += `# Main Instructions:\n${mainInstructions}\n\n`;
    }

    // Generate textual project tree while excluding ignored directories
    const treeText = generateTextualTree(tree, excludedPaths, filterExtensions);
    if (treeText.trim()) {
      combined += `# Project Tree:\n${treeText}\n\n`;
    }

    if (filesData.length > 0) {
      combined += `# Selected Files:\n`;
      for (const f of filesData) {
        combined += `## File: ${f.path}\n${f.content}\n\n`;
      }
    }

    await navigator.clipboard.writeText(combined);
    alert('Copied to clipboard!');
  };

  return (
    <button 
      onClick={handleCopy} 
      className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium"
    >
      Copy All to Clipboard
    </button>
  );
};

export default CopyButton;

async function getLocalFilesContent(filesToCopy: string[], fileList: FileList | null): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];

  for (const filePath of filesToCopy) {
    let content = '';
    if (fileList) {
      const fileItem = findFileInList(fileList, filePath);
      if (fileItem) {
        content = await fileItem.text();
      } else {
        content = 'File not found in local selection.';
      }
    } else {
      content = 'No local files selected. Unable to load content offline.';
    }

    results.push({ path: filePath, content });
  }

  return results;
}

function findFileInList(fileList: FileList | null, relativePath: string): File | null {
  if (!fileList) return null;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if ((f as any).webkitRelativePath === relativePath) return f;
  }
  return null;
}

/**
 * Generate a textual tree of the project, excluding any directory
 * whose path matches an item in `excludedPaths`.
 */
function generateTextualTree(
  tree: FileNode[],
  excludedPaths: string[],
  filterExtensions: string[],
  depth: number = 0
): string {
  let result = '';
  const indent = '  '.repeat(depth);

  // Filter out nodes that are in excludedPaths or whose ancestors are in excludedPaths
  const filteredNodes = tree.filter(node => {
    // If node's relativePath matches or starts with any excluded path, skip it.
    if (
      excludedPaths.some(
        ignored =>
          node.relativePath === ignored ||
          node.relativePath.startsWith(ignored + '/')
      )
    ) {
      return false;
    }
    // If it's a directory or file that doesn't match the extension filter, skip
    return nodeMatchesExtensions(node, filterExtensions);
  });

  for (const node of filteredNodes) {
    const icon = node.type === 'directory' ? '📁' : '📄';
    result += `${indent}${icon} ${node.name}\n`;
    if (node.children && node.children.length > 0) {
      // Recurse deeper
      result += generateTextualTree(node.children, excludedPaths, filterExtensions, depth + 1);
    }
  }
  return result;
}

function nodeMatchesExtensions(node: FileNode, extensions: string[]): boolean {
  if (extensions.length === 0) return true;
  if (node.type === 'directory') {
    // Keep directories if they have any child that matches
    return node.children
      ? node.children.some(child => nodeMatchesExtensions(child, extensions))
      : false;
  } else {
    return matchesAnyExtension(node.name, extensions);
  }
}

function matchesAnyExtension(fileNameOrPath: string, extensions: string[]): boolean {
  if (extensions.length === 0) return true;
  const lowerName = fileNameOrPath.toLowerCase();
  return extensions.some(ext => lowerName.endsWith(ext.toLowerCase()));
}
