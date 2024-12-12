import React, { useEffect, useState } from 'react';
import FileTree from '../components/FileTree';
import SelectedFilesList from '../components/SelectedFilesList';
import InstructionsInput from '../components/InstructionsInput';
import CopyButton from '../components/CopyButton';

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
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [metaPrompt, setMetaPrompt] = useState('');
  const [mainInstructions, setMainInstructions] = useState('');
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [excludedPaths, setExcludedPaths] = useState<string[]>(['.next', 'node_modules']);
  const [fileList, setFileList] = useState<FileList | null>(null);
  const [showTree, setShowTree] = useState(true);

  // Meta prompt related states
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([]);
  const [selectedMetaFile, setSelectedMetaFile] = useState('');
  const [newMetaFileName, setNewMetaFileName] = useState('');

  // Settings for meta prompts folder
  const [selectedMetaPromptDir, setSelectedMetaPromptDir] = useState('');

  useEffect(() => {
    // Load last chosen directory from localStorage
    const savedDir = localStorage.getItem('selectedMetaPromptDir');
    if (savedDir) {
      setSelectedMetaPromptDir(savedDir);
    } else {
      // Default to sample_project/meta_prompts if none chosen
      setSelectedMetaPromptDir('sample_project/meta_prompts');
    }
  }, []);

  useEffect(() => {
    // Whenever selectedMetaPromptDir changes, save it and refresh meta prompt files
    localStorage.setItem('selectedMetaPromptDir', selectedMetaPromptDir);
    if (selectedMetaPromptDir.trim()) {
      fetchMetaPromptFiles();
    }
  }, [selectedMetaPromptDir]);

  useEffect(() => {
    if (fileList) {
      const filesArray = Array.from(fileList);
      const builtTree = buildTreeFromFileList(filesArray);
      setTree(builtTree);
    } else {
      fetchInitialTreeFromAPI();
    }
  }, [fileList]);

  async function fetchInitialTreeFromAPI() {
    const res = await fetch('/api/files?action=tree', { cache: 'no-store' });
    const data = await res.json();
    setTree(data.tree);
  }

  useEffect(() => {
    (async () => {
      const newFilesData: FileData[] = [];
      for (const filePath of selectedFiles) {
        const fileItem = findFileInList(fileList, filePath);
        if (!fileItem) continue;
        const content = await fileItem.text();
        const tokenCount = approximateTokenCount(content);
        newFilesData.push({ path: filePath, content, tokenCount });
      }
      setFilesData(newFilesData);
    })();
  }, [selectedFiles, fileList]);

  function getFilteredFilesData() {
    return filesData.filter(fd => !isPathExcluded(fd.path, excludedPaths));
  }

  function isPathExcluded(p: string, excluded: string[]): boolean {
    return excluded.some(ex => p === ex || p.startsWith(ex + '/'));
  }

  function handleDirectoryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileList(files);
    } else {
      setFileList(null);
    }
  }

  async function handleRefresh() {
    await fetchInitialTreeFromAPI();
  }

  async function fetchMetaPromptFiles() {
    if (!selectedMetaPromptDir.trim()) return;
    const res = await fetch(`/api/metaprompts?action=list&dir=${encodeURIComponent(selectedMetaPromptDir)}`);
    const data = await res.json();
    if (data.files) {
      setMetaPromptFiles(data.files);
    } else {
      setMetaPromptFiles([]);
    }
  }

  async function onLoadMetaPrompt() {
    if (!selectedMetaFile) return;
    if (!selectedMetaPromptDir.trim()) return;
    const res = await fetch(`/api/metaprompts?action=load&file=${encodeURIComponent(selectedMetaFile)}&dir=${encodeURIComponent(selectedMetaPromptDir)}`);
    const data = await res.json();
    if (data.content !== undefined) {
      setMetaPrompt(data.content);
    } else {
      alert('Failed to load meta prompt file');
    }
  }

  async function onSaveMetaPrompt() {
    let filename = newMetaFileName.trim() || selectedMetaFile.trim();
    if (!filename) {
      alert('Please provide a filename or select an existing file to save.');
      return;
    }

    // Ensure .txt extension
    if (!filename.endsWith('.txt')) {
      filename = filename + '.txt';
    }

    const res = await fetch(`/api/metaprompts?dir=${encodeURIComponent(selectedMetaPromptDir)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content: metaPrompt })
    });
    const data = await res.json();
    if (data.success) {
      alert('Meta prompt saved successfully!');
      setNewMetaFileName('');
      setSelectedMetaFile(filename);
      await fetchMetaPromptFiles();
    } else {
      alert(`Failed to save: ${data.error || 'Unknown error'}`);
    }
  }

  // Refresh meta list with the currently selected directory
  function onRefreshMetaList() {
    fetchMetaPromptFiles();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1e1f29] text-[#e0e2f0]">

      {/* Header / Navbar */}
      <div className="w-full px-6 py-4 border-b border-[#3f4257] flex items-center justify-between bg-[#1e1f29] bg-opacity-90">
        <h1 className="text-2xl font-bold tracking-wide text-[#e0e2f0] hover:text-[#8be9fd]">
          My Offline LLM Tool
        </h1>
        <div className="text-sm text-[#bd93f9] hover:text-[#ff79c6] transition-colors">
          A professional prompt composition environment
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

      <div className="flex flex-1 overflow-hidden">
        {showTree && (
          <div className="w-1/4 border-r border-[#3f4257] p-4 overflow-auto bg-[#1e1f29] bg-opacity-85">
            <h2 className="text-lg font-semibold mb-4 border-b border-[#3f4257] pb-2 text-[#e0e2f0]">
              Project Tree
            </h2>
            <div className="mb-4 flex flex-col gap-2">
              <label className="font-medium text-sm text-[#e0e2f0]">
                Select Folder:
                <input
                  type="file"
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  className="mt-1 block w-full text-sm text-[#e0e2f0] bg-[#2c2f3f] border border-[#3f4257] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#8be9fd]"
                  onChange={handleDirectoryChange}
                />
              </label>
              <button
                onClick={handleRefresh}
                className="text-sm px-3 py-1 bg-[#8be9fd] hover:bg-[#50fa7b] rounded font-medium text-[#1e1f29]"
              >
                Refresh
              </button>
            </div>
            <p className="mb-2 text-sm text-[#e0e2f0]">
              Select files or directories to include:
            </p>
            <div className="bg-[#2c2f3f] rounded p-2 border border-[#3f4257] shadow-sm">
              <FileTree tree={tree} onSelectFiles={setSelectedFiles} />
            </div>
          </div>
        )}

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold text-[#e0e2f0] hover:text-[#8be9fd]">
                Compose Your Prompt
              </h1>
              <p className="text-sm text-[#bd93f9] hover:text-[#ff79c6]">
                Combine files and instructions to create a perfect prompt.
              </p>
            </div>

            {/* Settings Menu for Meta Prompts Folder */}
            <div className="bg-[#2c2f3f] bg-opacity-90 p-4 rounded-lg shadow-lg border border-[#3f4257] space-y-4">
              <h2 className="text-xl font-semibold text-[#e0e2f0] border-b border-[#3f4257] pb-2">
                Settings
              </h2>
              <label className="block font-medium mb-1 text-[#e0e2f0] text-sm">
                Meta Prompts Folder (relative or absolute path):
              </label>
              <input
                type="text"
                value={selectedMetaPromptDir}
                onChange={(e) => setSelectedMetaPromptDir(e.target.value)}
                className="w-full p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-[#e0e2f0] text-sm focus:outline-none focus:border-[#8be9fd]"
                placeholder="e.g., sample_project/meta_prompts"
              />
              <p className="text-xs text-gray-400">
                Changes will be saved and the meta prompt list will refresh automatically.
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
                filesData={getFilteredFilesData().map(({ path, tokenCount }) => ({ path, tokenCount }))}
              />
            </div>

            <div className="text-right">
              <CopyButton
                metaPrompt={metaPrompt}
                mainInstructions={mainInstructions}
                filesData={getFilteredFilesData()}
                tree={tree}
                excludedPaths={excludedPaths}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTreeFromFileList(files: File[]): FileNode[] {
  const root: { [key: string]: any } = {};

  for (const file of files) {
    const parts = file.webkitRelativePath.split('/');
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

function findFileInList(fileList: FileList | null, relativePath: string): File | null {
  if (!fileList) return null;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if (f.webkitRelativePath === relativePath) return f;
  }
  return null;
}

function approximateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
