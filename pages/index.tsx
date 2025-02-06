// pages/index.tsx

import React, { useEffect, useState } from 'react'
import FileTree from '../views/FileTreeView'
import SelectedFilesList from '../views/SelectedFilesListView'
import InstructionsInput from '../views/InstructionsInputView'
import CopyButton from '../views/CopyButtonView'
import TodoList from '../views/TodoListView'

const BACKEND_URL = 'http://localhost:5000'

/**
 * For reference: shape of tree nodes.
 */
interface FileNode {
  name: string
  relativePath: string
  absolutePath: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileData {
  path: string
  content: string
  tokenCount: number
}

export default function HomePage() {
  // ---------- States ----------
  const [metaPrompt, setMetaPrompt] = useState('')
  const [mainInstructions, setMainInstructions] = useState('')
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([])
  const [selectedMetaFile, setSelectedMetaFile] = useState('')
  const [newMetaFileName, setNewMetaFileName] = useState('')

  const [rootDir, setRootDir] = useState('')
  const [extensionFilterInput, setExtensionFilterInput] = useState('')
  const filterExtensions = extensionFilterInput
    .split(',')
    .map(ext => ext.trim())
    .filter(ext => ext)

  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filesData, setFilesData] = useState<FileData[]>([])

  const [showTree, setShowTree] = useState(true)
  const [showExtensionFilter, setShowExtensionFilter] = useState(false)

  // ---------- Lifecycle ----------
  useEffect(() => {
    const savedMeta = localStorage.getItem('currentMetaPrompt') || ''
    const savedMain = localStorage.getItem('currentMainInstructions') || ''
    setMetaPrompt(savedMeta)
    setMainInstructions(savedMain)
    refreshMetaPromptList()
  }, [])

  useEffect(() => {
    localStorage.setItem('currentMetaPrompt', metaPrompt)
  }, [metaPrompt])

  useEffect(() => {
    localStorage.setItem('currentMainInstructions', mainInstructions)
  }, [mainInstructions])

  // ---------- API calls ----------
  async function loadTreeFromBackend() {
    if (!rootDir.trim()) {
      alert('Please enter a directory path.')
      return
    }
    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/projects/tree?rootDir=${encodeURIComponent(rootDir.trim())}`
      )
      const json = await resp.json()
      if (json.success) {
        setTree(json.data)
      } else {
        alert('Error fetching tree: ' + json.message)
      }
    } catch (err) {
      console.error('Network or server error:', err)
      alert('Failed to fetch project tree. Check console for details.')
    }
  }

  /**
   * Fetch content for each selected file from the backend.
   * We pass `rootDir` as the baseDir, plus the relative file paths in `paths`.
   */
  async function fetchSelectedFilesFromBackend(paths: string[]): Promise<FileData[]> {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/projects/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseDir: rootDir.trim(),
          paths,
        }),
      })
      const json = await resp.json()
      if (json.success) {
        return json.data
      } else {
        console.error('Error fetching file content:', json.message)
        return []
      }
    } catch (err) {
      console.error('Network error:', err)
      return []
    }
  }

  // Whenever selectedFiles changes, fetch file data
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setFilesData([])
      return
    }
    fetchSelectedFilesFromBackend(selectedFiles).then(data => {
      setFilesData(data)
    })
  }, [selectedFiles])

  async function fetchLatestFileData() {
    if (selectedFiles.length === 0) {
      return []
    }
    // Fetch from backend again for the currently selected files
    const updated = await fetchSelectedFilesFromBackend(selectedFiles)
    // Update state
    setFilesData(updated)
    // Return fresh data so CopyButton can use it right away
    return updated
  }

  // ---------- Meta Prompt Storage ----------
  function onLoadMetaPrompt() {
    if (!selectedMetaFile) {
      alert('No meta prompt file selected.')
      return
    }
    const content = localStorage.getItem('metaprompt:' + selectedMetaFile)
    if (content !== null) setMetaPrompt(content)
    else alert('Meta prompt file not found in localStorage.')
  }

  function onSaveMetaPrompt() {
    const filename = newMetaFileName.trim() || selectedMetaFile.trim()
    if (!filename) {
      alert('Please provide a filename before saving.')
      return
    }
    if (!metaPrompt.trim()) {
      alert('Meta prompt content is empty.')
      return
    }
    let finalName = filename
    if (!finalName.endsWith('.txt')) {
      finalName += '.txt'
    }
    localStorage.setItem('metaprompt:' + finalName, metaPrompt)
    alert('Meta prompt saved successfully!')
    refreshMetaPromptList()
  }

  function refreshMetaPromptList() {
    const keys = Object.keys(localStorage)
    const files = keys
      .filter(k => k.startsWith('metaprompt:'))
      .map(k => k.replace('metaprompt:', ''))
    setMetaPromptFiles(files)
  }

  // ---------- Render ----------
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-panel bg-panel px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#fff] hover:text-[#7b93fd] transition-colors">
          My Offline LLM Tool
        </h1>
        <div className="text-sm text-gray-300 hover:text-gray-200">
          All logic from Python backend
        </div>
      </div>

      {/* Tools row */}
      <div className="px-6 py-2 flex items-center gap-4 border-b border-panel bg-panel shadow-panel">
        <label className="text-sm text-gray-200 flex items-center gap-2">
          Show Project Tree?
          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-1">
              <input
                type="radio"
                name="showTree"
                checked={showTree}
                onChange={() => setShowTree(true)}
                className="accent-[#7b93fd]"
              />
              On
            </label>
            <label className="cursor-pointer flex items-center gap-1">
              <input
                type="radio"
                name="showTree"
                checked={!showTree}
                onChange={() => setShowTree(false)}
                className="accent-[#7b93fd]"
              />
              Off
            </label>
          </div>
        </label>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left side: Project Tree */}
        {showTree && (
          <div className="w-1/4 border-r border-panel bg-panel shadow-panel p-3 overflow-auto scrollbar-thin">
            <h2 className="text-lg font-semibold mb-2 border-b border-panel pb-1 text-[#bd93f9]">
              Project Tree
            </h2>

            <label className="block text-sm font-medium text-gray-300 mb-1">
              Enter directory path:
            </label>
            <input
              type="text"
              value={rootDir}
              onChange={e => setRootDir(e.target.value)}
              placeholder="e.g. /home/user/your-project"
              className="w-full mb-2 text-sm rounded border border-[#3f4257] bg-[#1e1f29] px-2 py-1 text-gray-100 focus:outline-none focus:border-[#7b93fd]"
            />

            <div className="flex gap-2 mb-3">
              <button
                onClick={loadTreeFromBackend}
                className="text-sm px-3 py-1 bg-[#7b93fd] hover:bg-[#50fa7b] rounded font-medium text-[#1e1f29]"
              >
                Load Tree
              </button>
              <button
                onClick={() => setShowExtensionFilter(!showExtensionFilter)}
                className="text-sm px-3 py-1 bg-[#ff79c6] hover:bg-[#ff92dd] rounded font-medium text-[#1e1f29]"
              >
                Filter
              </button>
            </div>

            {showExtensionFilter && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Extensions (.js, .ts, etc):
                </label>
                <input
                  type="text"
                  value={extensionFilterInput}
                  onChange={e => setExtensionFilterInput(e.target.value)}
                  className="w-full mt-1 text-sm rounded border border-[#3f4257] bg-[#1e1f29] px-2 py-1 text-gray-100 focus:outline-none focus:border-[#7b93fd]"
                />
              </div>
            )}

            <div className="text-sm text-gray-300 mb-1">
              Select files or directories:
            </div>
            <div className="bg-[#1e1f29] rounded border border-[#3f4257] p-2 scrollbar-thin max-h-[60vh] overflow-auto">
              <FileTree
                tree={tree}
                onSelectFiles={setSelectedFiles}
                filterExtensions={filterExtensions}
              />
            </div>
          </div>
        )}

        {/* Middle content */}
        <div className="flex-1 bg-[#1e1f29] p-6 overflow-auto scrollbar-thin">
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-100 hover:text-[#50fa7b] transition-colors">
                Compose Your Prompt
              </h1>
              <p className="text-sm text-gray-400">
                Combine files, meta, main instructions, and copy the entire context.
              </p>
            </header>

            <div className="bg-panel p-4 rounded border border-panel shadow-panel space-y-3">
              <h2 className="text-xl font-semibold text-[#7b93fd] border-b border-panel pb-1">
                Settings
              </h2>
              <p className="text-sm text-gray-400">
                All meta prompts are stored in local storage by default.
              </p>
            </div>

            <div className="bg-panel p-4 rounded border border-panel shadow-panel space-y-3">
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
                onRefreshMetaList={refreshMetaPromptList}
              />
            </div>

            <div className="bg-panel p-4 rounded border border-panel shadow-panel space-y-3">
              <h2 className="text-xl font-semibold text-[#7b93fd] border-b border-panel pb-1">
                Selected Files
              </h2>
              <SelectedFilesList
                selectedFiles={selectedFiles}
                filterExtensions={filterExtensions}
                filesData={filesData}
              />
            </div>

            <div className="flex justify-end">
                <CopyButton
                metaPrompt={metaPrompt}
                mainInstructions={mainInstructions}
                selectedFiles={selectedFiles}
                filesData={filesData}
                tree={tree}
                excludedPaths={[]}
                filterExtensions={filterExtensions}
                /**
                 * Now you actually pass the callback:
                 */
                onFetchLatestFileData={fetchLatestFileData}
              />
            </div>
          </div>
        </div>

        {/* Right side: Todo List */}
        <div className="w-1/4 border-l border-panel bg-panel shadow-panel p-3 overflow-auto scrollbar-thin">
          <h2 className="text-lg font-semibold mb-2 border-b border-panel pb-1 text-[#7b93fd]">
            To-Do List
          </h2>
          <TodoList />
        </div>
      </div>
    </div>
  )
}
