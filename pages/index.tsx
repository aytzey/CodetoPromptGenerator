import React, { useEffect, useState } from 'react';
import FileTree from '../components/FileTree';
import SelectedFilesList from '../components/SelectedFilesList';
import InstructionsInput from '../components/InstructionsInput';
import CopyButton from '../components/CopyButton';
import TodoList from '../components/TodoList'; 

interface FileNode {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileData {
  path: string;
  content: string;
  tokenCount: number;
}

export default function HomePage() {
  // State for prompts and instructions
  const [metaPrompt, setMetaPrompt] = useState('');
  const [mainInstructions, setMainInstructions] = useState('');

  // Store meta prompts in localStorage
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([]);
  const [selectedMetaFile, setSelectedMetaFile] = useState('');
  const [newMetaFileName, setNewMetaFileName] = useState('');

  // Extension filter (if any)
  const [extensionFilterInput, setExtensionFilterInput] = useState('');
  const filterExtensions = extensionFilterInput
    .split(',')
    .map(ext => ext.trim())
    .filter(ext => ext.length > 0);

  // Tree and file selection
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileList, setFileList] = useState<FileList | null>(null);

  const [showTree, setShowTree] = useState(true);
  const [showExtensionFilter, setShowExtensionFilter] = useState(false);

  const [filesData, setFilesData] = useState<FileData[]>([]);

  // On first load, try to load meta prompt and instructions from localStorage
  useEffect(() => {
    const savedMetaPrompt = localStorage.getItem('currentMetaPrompt') || '';
    const savedMainInstructions = localStorage.getItem('currentMainInstructions') || '';
    setMetaPrompt(savedMetaPrompt);
    setMainInstructions(savedMainInstructions);
    refreshMetaPromptList();
  }, []);

  // Whenever metaPrompt or mainInstructions change, save them to localStorage
  useEffect(() => {
    localStorage.setItem('currentMetaPrompt', metaPrompt);
  }, [metaPrompt]);

  useEffect(() => {
    localStorage.setItem('currentMainInstructions', mainInstructions);
  }, [mainInstructions]);

  // Build tree from FileList whenever fileList changes
  useEffect(() => {
    if (fileList) {
      const filesArray = Array.from(fileList);
      const builtTree = buildTreeFromFileList(filesArray); // ADDED OR MODIFIED
      setTree(builtTree);
    } else {
      setTree([]);
    }
  }, [fileList]);

  // Recompute filesData when selectedFiles or fileList changes
  useEffect(() => {
    fetchAndComputeFilesData();
  }, [selectedFiles, fileList]);

  function handleDirectoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileList(files);
    } else {
      setFileList(null);
      setTree([]);
    }
  }

  function handleRefresh() {
    // Just rebuild from FileList
    if (fileList) {
      const filesArray = Array.from(fileList);
      const builtTree = buildTreeFromFileList(filesArray); // ADDED OR MODIFIED
      setTree(builtTree);
    }
  }

  async function fetchAndComputeFilesData() {
    const newFilesData: FileData[] = [];

    // If no fileList is provided, we cannot load file contents
    if (!fileList) {
      setFilesData([]);
      return;
    }

    for (const filePath of selectedFiles) {
      if (isDirectory(filePath, tree)) {
        // Directories have no content
        continue;
      }

      let content = 'File not found.';
      const fileItem = findFileInList(fileList, filePath);
      if (fileItem) {
        content = await fileItem.text();
      } else {
        content = 'File not found in local selection.';
      }

      // Simple word-based token approximation
      const tokenCount = approximateTokenCount(content);
      newFilesData.push({ path: filePath, content, tokenCount });
    }
    setFilesData(newFilesData);
  }

  // LocalStorage-based meta prompt handling
  function onLoadMetaPrompt() {
    if (!selectedMetaFile) {
      alert('No meta prompt file selected.');
      return;
    }
    const content = localStorage.getItem('metaprompt:' + selectedMetaFile);
    if (content !== null) {
      setMetaPrompt(content);
    } else {
      alert('Meta prompt file not found in localStorage.');
    }
  }

  function onSaveMetaPrompt() {
    const filename = newMetaFileName.trim() || selectedMetaFile.trim();
    if (!filename) {
      alert('Please provide a filename before saving.');
      return;
    }
    if (!metaPrompt.trim()) {
      alert('Meta prompt content is empty.');
      return;
    }

    // Ensure .txt extension
    let finalName = filename;
    if (!finalName.endsWith('.txt')) {
      finalName += '.txt';
    }

    localStorage.setItem('metaprompt:' + finalName, metaPrompt);
    alert('Meta prompt saved successfully!');
    refreshMetaPromptList();
  }

  function onRefreshMetaList() {
    refreshMetaPromptList();
  }

  function refreshMetaPromptList() {
    const keys = Object.keys(localStorage);
    const files = keys
      .filter(k => k.startsWith('metaprompt:'))
      .map(k => k.replace('metaprompt:', ''));
    setMetaPromptFiles(files);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1e1f29] text-[#e0e2f0]">
      {/* Header / Navbar */}
      <div className="w-full px-6 py-4 border-b border-[#3f4257] flex items-center justify-between bg-[#1e1f29] bg-opacity-90">
        <h1 className="text-2xl font-bold tracking-wide text-[#e0e2f0] hover:text-[#8be9fd]">
          My Offline LLM Tool
        </h1>
        <div className="text-sm text-[#bd93f9] hover:text-[#ff79c6] transition-colors">
          A professional prompt composition environment (Offline)
        </div>
      </div>

      <div className="px-6 py-2 flex items-center gap-4 bg-[#1e1f29] bg-opacity-70 border-b border-[#3f4257]">
        <span className="text-[#e0e2f0] text-sm">Show Project Tree?</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center text-sm text-[#e0e2f0] cursor-pointer">
            <input type="radio" name="showTree" checked={showTree} onChange={() => setShowTree(true)} className="mr-1" />
            On
          </label>
          <label className="flex items-center text-sm text-[#e0e2f0] cursor-pointer">
            <input type="radio" name="showTree" checked={!showTree} onChange={() => setShowTree(false)} className="mr-1" />
            Off
          </label>
        </div>
      </div>

      {/* Main layout: left side for prompt composition and project tree, right side for todo list */}
      <div className="flex flex-1 overflow-hidden">
        {showTree && (
          <div className="w-1/4 border-r border-[#3f4257] p-4 overflow-auto bg-[#1e1f29] bg-opacity-85">
            <h2 className="text-lg font-semibold mb-4 border-b border-[#3f4257] pb-2 text-[#e0e2f0]">
              Project Tree
            </h2>
            <div className="mb-4 flex flex-col gap-2">
              <label className="font-medium text-sm text-[#e0e2f0]">
                Select Folder (Local):
                <input
                  type="file"
                  ref={input => input && (input.webkitdirectory = true)}
                  multiple
                  className="mt-1 block w-full text-sm text-[#e0e2f0] bg-[#2c2f3f] border border-[#3f4257] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8be9fd]"
                  onChange={handleDirectoryChange}
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="text-sm px-3 py-1 bg-[#8be9fd] hover:bg-[#50fa7b] rounded font-medium text-[#1e1f29]"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowExtensionFilter(!showExtensionFilter)}
                  className="text-sm px-3 py-1 bg-[#bd93f9] hover:bg-[#ff79c6] rounded font-medium text-[#1e1f29]"
                >
                  Filter by file extension
                </button>
              </div>
              {showExtensionFilter && (
                <div className="mt-2">
                  <label className="font-medium text-sm text-[#e0e2f0]">Enter extensions (e.g. .js, .ts):</label>
                  <input
                    type="text"
                    value={extensionFilterInput}
                    onChange={(e) => setExtensionFilterInput(e.target.value)}
                    className="w-full mt-1 block text-sm text-[#e0e2f0] bg-[#2c2f3f] border border-[#3f4257] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8be9fd]"
                  />
                  <p className="text-xs text-gray-400 mt-1">Only files with these extensions will be shown. Leave empty for all.</p>
                </div>
              )}
            </div>
            <p className="mb-2 text-sm text-[#e0e2f0]">
              Select files or directories to include:
            </p>
            <div className="bg-[#2c2f3f] rounded p-2 border border-[#3f4257] shadow-sm">
              <FileTree
                tree={tree}
                onSelectFiles={setSelectedFiles}
                filterExtensions={filterExtensions}
              />
            </div>
          </div>
        )}

        {/* Middle content: Prompt Composition */}
        <div className="flex-1 p-6 overflow-auto bg-[#1e1f29]">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold text-[#e0e2f0] hover:text-[#8be9fd]">
                Compose Your Prompt
              </h1>
              <p className="text-sm text-[#bd93f9] hover:text-[#ff79c6]">
                Combine files and instructions to create a perfect prompt. (Offline, no server)
              </p>
            </div>

            <div className="bg-[#2c2f3f] bg-opacity-90 p-4 rounded-lg shadow-lg border border-[#3f4257] space-y-4">
              <h2 className="text-xl font-semibold text-[#e0e2f0] border-b border-[#3f4257] pb-2">
                Settings
              </h2>
              <p className="text-sm text-gray-400">
                Meta prompts are stored in localStorage under keys starting with "metaprompt:". Use the interface below to load, refresh, and save meta prompts.
              </p>
            </div>

            <div className="bg-[#2c2f3f] bg-opacity-90 p-4 rounded-lg shadow-lg border border-[#3f4257] space-y-4">
              <InstructionsInput
                metaPrompt={metaPrompt}
                setMetaPrompt={setMetaPrompt}
                mainInstructions={mainInstructions}
                setMainInstructions={setMainInstructions}
                metaPromptFiles={metaPromptFiles}
                selectedMetaFile={selectedMetaFile}
                setSelectedMetaFile={setSelectedMetaFile}
                onLoadMetaPrompt={onLoadMetaPrompt}
                onSaveMetaPrompt={onSaveMetaPrompt}
                newMetaFileName={newMetaFileName}
                setNewMetaFileName={setNewMetaFileName}
                onRefreshMetaList={onRefreshMetaList}
              />
            </div>

            <div className="bg-[#2c2f3f] bg-opacity-90 p-4 rounded-lg shadow-lg border border-[#3f4257] space-y-4">
              <h2 className="text-xl font-semibold text-[#e0e2f0] border-b border-[#3f4257] pb-2">
                Selected Files
              </h2>
              <SelectedFilesList
                selectedFiles={selectedFiles}
                filterExtensions={filterExtensions}
                filesData={filesData}
              />
            </div>

            <div className="text-right">
              <CopyButton
                metaPrompt={metaPrompt}
                mainInstructions={mainInstructions}
                selectedFiles={selectedFiles}
                fileList={fileList}
                tree={tree}
                excludedPaths={[]}
                filterExtensions={filterExtensions}
              />
            </div>
          </div>
        </div>

        {/* Right side: Todo List */}
        <div className="w-1/4 border-l border-[#3f4257] p-4 overflow-auto bg-[#1e1f29] bg-opacity-85">
          <h2 className="text-lg font-semibold mb-4 border-b border-[#3f4257] pb-2 text-[#e0e2f0]">
            To-Do List
          </h2>
          <TodoList />
        </div>
      </div>
    </div>
  );
}

// Helper functions
function approximateTokenCount(text: string): number {
  // Simple approximation: count words
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function isDirectory(pathStr: string, tree: FileNode[]): boolean {
  return !!findNode(pathStr, tree, 'directory');
}

function findNode(pathStr: string, nodes: FileNode[], type?: 'file' | 'directory'): FileNode | null {
  for (const n of nodes) {
    if (n.relativePath === pathStr) {
      if (!type || n.type === type) return n;
    }
    if (n.children) {
      const found = findNode(pathStr, n.children, type);
      if (found) return found;
    }
  }
  return null;
}

function findFileInList(fileList: FileList | null, relativePath: string): File | null {
  if (!fileList) return null;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if ((f as any).webkitRelativePath === relativePath) return f;
  }
  return null;
}

// --- ADDED OR MODIFIED ---
function buildTreeFromFileList(files: File[]): FileNode[] {
  // We'll skip entries if they include .git, node_modules, or .next
  const skipDirs = [".git", "node_modules", ".next"]; // ADDED OR MODIFIED

  const root: { [key: string]: any } = {};

  for (const file of files) {
    const parts = (file as any).webkitRelativePath.split('/');

    // If any part is in skipDirs, skip the entire file
    if (parts.some((segment: string) => skipDirs.includes(segment))) {
      continue; // ADDED OR MODIFIED
    }

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }

  function buildNodes(obj: any, base: string = ''): FileNode[] {
    const entries = Object.keys(obj).sort();
    return entries.map(entry => {
      const fullPath = base ? base + '/' + entry : entry;
      if (obj[entry] === null) {
        return {
          name: entry,
          relativePath: fullPath,
          type: 'file'
        } as FileNode;
      } else {
        return {
          name: entry,
          relativePath: fullPath,
          type: 'directory',
          children: buildNodes(obj[entry], fullPath)
        } as FileNode;
      }
    });
  }

  return buildNodes(root);
}
