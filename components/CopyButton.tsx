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
  filesData: { path: string; content: string; tokenCount: number }[];
  tree: FileNode[];
  excludedPaths: string[];
}

const CopyButton: React.FC<CopyButtonProps> = ({ metaPrompt, mainInstructions, filesData, tree, excludedPaths }) => {
  const handleCopy = async () => {
    console.log('[Debug] handleCopy triggered');
    console.log('[Debug] excludedPaths:', excludedPaths);
    console.log('[Debug] filesData:', filesData.map(f => f.path));
    console.log('[Debug] tree:', tree);

    let combined = '';
    if (metaPrompt.trim()) {
      combined += `# Meta Prompt:\n${metaPrompt}\n\n`;
    }
    if (mainInstructions.trim()) {
      combined += `# Main Instructions:\n${mainInstructions}\n\n`;
    }

    console.log('[Debug] Generating textual tree with exclusions...');
    const treeText = generateTextualTree(tree, excludedPaths);
    console.log('[Debug] Generated treeText:', treeText);

    if (treeText.trim()) {
      combined += `# Project Tree:\n${treeText}\n\n`;
    }

    if (filesData.length > 0) {
      combined += `# Selected Files:\n`;
      for (const f of filesData) {
        combined += `## File: ${f.path}\n${f.content}\n\n`;
      }
    }

    console.log('[Debug] Final combined text to copy:', combined);

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


function generateTextualTree(tree: FileNode[], excludedPaths: string[], depth: number = 0): string {
  let result = '';
  const indent = '  '.repeat(depth);

  const filteredNodes = tree.filter(node => {
    const excluded = isExcluded(node, excludedPaths);
    console.log(`[Debug] Checking node "${node.relativePath}" type:${node.type}, excluded:`, excluded);
    return !excluded;
  });

  for (const node of filteredNodes) {
    const icon = node.type === 'directory' ? '📁' : '📄';
    console.log(`[Debug] Including node "${node.relativePath}" type:${node.type}`);
    result += `${indent}${icon} ${node.name}\n`;
    if (node.children && node.children.length > 0) {
      result += generateTextualTree(node.children, excludedPaths, depth + 1);
    }
  }
  return result;
}

function isExcluded(node: FileNode, excludedPaths: string[]): boolean {
    const nodePath = node.relativePath;
  
    // Hard-code exclusion if path contains `.next` or `node_modules`
    if (nodePath.includes('.next') || nodePath.includes('node_modules')) {
      console.log(`[Debug] Excluding "${nodePath}" because it contains .next or node_modules`);
      return true;
    }
  
    // Also check against explicitly excluded paths
    for (const p of excludedPaths) {
      if (nodePath === p || nodePath.startsWith(p + '/')) {
        console.log(`[Debug] Excluding "${nodePath}" due to match with excludedPaths: ${p}`);
        return true;
      }
    }
  
    return false;
  }
  
