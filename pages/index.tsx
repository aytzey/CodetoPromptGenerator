// pages/index.tsx

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import {
  Settings,
  FileCode,
  List,
  Sun,
  Moon,
  Github,
  Folder as FolderIcon, // rename to avoid collision
  HardDrive,
  Copy,
  Search
} from 'lucide-react'

// Import sub-components
import FileTreeView from '../views/FileTreeView'
import InstructionsInputView from '../views/InstructionsInputView'
import CopyButtonView from '../views/CopyButtonView'
import SelectedFilesListView from '../views/SelectedFilesListView'
import FolderPickerView from '../views/FolderPickerView'
import ExclusionsManagerView from '../views/ExclusionsManagerView'
import TodoListView from '../views/TodoListView'

// Types
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

export default function Home() {
  // ---------------------------------
  // State: for file tree and selection
  // ---------------------------------
  const [projectPath, setProjectPath] = useState<string>('')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filesData, setFilesData] = useState<FileData[]>([])
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false)

  // Exclusions
  const [excludedPaths, setExcludedPaths] = useState<string[]>([])

  // Prompts
  const [metaPrompt, setMetaPrompt] = useState<string>('')
  const [mainInstructions, setMainInstructions] = useState<string>('')
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([])
  const [selectedMetaFile, setSelectedMetaFile] = useState<string>('')
  const [newMetaFileName, setNewMetaFileName] = useState<string>('')

  // File Extension Filters
  const [filterExtensions, setFilterExtensions] = useState<string[]>([])
  const [extensionInput, setExtensionInput] = useState<string>('')

  // UI/UX
  const [activeTab, setActiveTab] = useState<'files' | 'options' | 'tasks'>('files')
  const [darkMode, setDarkMode] = useState<boolean>(true)

  // -----------------
  // Lifecycle: onMount
  // -----------------
  useEffect(() => {
    fetchExclusions()
    fetchMetaPromptList()
  }, [])

  // Re-load project tree if path or exclusions change
  useEffect(() => {
    if (projectPath) {
      loadProjectTree()
    }
  }, [projectPath, excludedPaths])

  // Load file contents when selected files change
  useEffect(() => {
    if (selectedFiles.length > 0) {
      loadSelectedFileContents()
    } else {
      setFilesData([])
    }
  }, [selectedFiles])

  // --------------------
  // API / Data Fetching
  // --------------------
  const fetchExclusions = async () => {
    try {
      const response = await fetch('/api/exclusions')
      const data = await response.json()
      if (data.success) {
        setExcludedPaths(data.exclusions || [])
      }
    } catch (error) {
      console.error('Error fetching exclusions:', error)
    }
  }

  const updateExclusions = async (paths: string[]) => {
    try {
      const response = await fetch('/api/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclusions: paths })
      })
      const data = await response.json()
      if (data.success) {
        setExcludedPaths(data.exclusions || [])
        // Reload the project tree to apply new exclusions
        if (projectPath) {
          loadProjectTree()
        }
      }
    } catch (error) {
      console.error('Error updating exclusions:', error)
      throw error
    }
  }

  const loadProjectTree = async () => {
    if (!projectPath) return

    setIsLoadingTree(true)
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath })
      })
      const data = await response.json()
      if (data.success) {
        setFileTree(data.tree || [])
      } else {
        console.error('Error loading project tree:', data.error)
      }
    } catch (error) {
      console.error('Error loading project tree:', error)
    } finally {
      setIsLoadingTree(false)
    }
  }

  const loadSelectedFileContents = async () => {
    try {
      const response = await fetch('/api/files/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath,
          files: selectedFiles.filter(p => !p.endsWith('/'))
        })
      })
      const data = await response.json()
      if (data.success) {
        setFilesData(data.filesData || [])
      }
    } catch (error) {
      console.error('Error loading file contents:', error)
    }
  }

  const fetchMetaPromptList = async () => {
    try {
      const response = await fetch('/api/metaprompts')
      const data = await response.json()
      if (data.success) {
        setMetaPromptFiles(data.files || [])
      }
    } catch (error) {
      console.error('Error fetching meta prompts:', error)
    }
  }

  const loadMetaPrompt = async () => {
    if (!selectedMetaFile) return
    try {
      const response = await fetch(`/api/metaprompts/${selectedMetaFile}`)
      const data = await response.json()
      if (data.success) {
        setMetaPrompt(data.content || '')
      }
    } catch (error) {
      console.error('Error loading meta prompt:', error)
    }
  }

  const saveMetaPrompt = async () => {
    if (!metaPrompt.trim()) return

    const fileName = newMetaFileName.trim() || selectedMetaFile || `meta_${Date.now()}.txt`
    try {
      const response = await fetch('/api/metaprompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content: metaPrompt })
      })
      const data = await response.json()
      if (data.success) {
        alert(`Meta prompt saved as ${fileName}`)
        setNewMetaFileName('')
        fetchMetaPromptList()
      }
    } catch (error) {
      console.error('Error saving meta prompt:', error)
    }
  }

  // -------------
  // Event Handlers
  // -------------
  const handleSelectFiles = (paths: string[]) => {
    setSelectedFiles(paths)
  }

  // Add or remove extension filters
  const handleAddExtension = () => {
    if (!extensionInput.trim()) return
    let ext = extensionInput.trim()
    if (!ext.startsWith('.')) {
      ext = `.${ext}`
    }
    if (!filterExtensions.includes(ext)) {
      setFilterExtensions(prev => [...prev, ext])
    }
    setExtensionInput('')
  }

  const handleRemoveExtension = (ext: string) => {
    setFilterExtensions(prev => prev.filter(e => e !== ext))
  }

  const handleClearExtensions = () => {
    setFilterExtensions([])
  }

  // Provide fresh data for the CopyButton
  const fetchLatestFileData = async (): Promise<FileData[]> => {
    try {
      const response = await fetch('/api/files/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath,
          files: selectedFiles.filter(p => !p.endsWith('/'))
        })
      })
      const data = await response.json()
      if (data.success) {
        return data.filesData || []
      }
      return []
    } catch (error) {
      console.error('Error fetching latest file data:', error)
      return []
    }
  }

  // --------------------------------------
  // Render
  // --------------------------------------
  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#141527] to-[#0B0C1B] ${darkMode ? '' : 'bg-gray-200'}`}>
      <Head>
        <title>Code to Prompt Generator</title>
        <meta name="description" content="Generate LLM prompts from your code" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* App Header */}
      <header className="bg-[#1A1B2E] border-b border-[#2A2C42] sticky top-0 z-10 px-6 py-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          {/* Left side: Title */}
          <div className="flex items-center space-x-2">
            <FileCode size={28} className="text-[#bd93f9]" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8be9fd] to-[#50fa7b] text-transparent bg-clip-text">
              Code to Prompt Generator
            </h1>
          </div>

          {/* Right side: Dark mode + GitHub button */}
          <div className="flex items-center space-x-4">
            <button
              className="p-2 rounded-full bg-[#282A36] hover:bg-[#3C3F57] text-gray-100 transition-all duration-300 shadow-md"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Moon size={20} className="text-[#8be9fd]" /> : <Sun size={20} className="text-[#f1fa8c]" />}
            </button>
            <button
              className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#3C3F57] hover:bg-[#50fa7b] hover:text-[#282A36] text-gray-100 transition-all duration-300 text-sm font-medium shadow-md"
              onClick={() => window.open('https://github.com', '_blank')}
            >
              <Github size={16} />
              <span>GitHub</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pt-6 pb-10">
        {/* Folder Picker */}
        <div className="bg-[#1A1B2E] rounded-xl border border-[#2A2C42] p-4 shadow-lg">
          <FolderPickerView
            currentPath={projectPath}
            onPathSelected={setProjectPath}
            isLoading={isLoadingTree}
          />
        </div>

        {/* 2-Column Layout */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel (spans 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabbed Nav */}
            <div className="flex items-center border-b border-[#2A2C42] pb-1">
              <button
                className={`px-5 py-2.5 font-medium text-sm rounded-t-lg flex items-center gap-2 transition-all ${
                  activeTab === 'files'
                    ? 'bg-[#1A1B2E] text-[#50fa7b] border-t border-l border-r border-[#2A2C42]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('files')}
              >
                <FileCode size={18} />
                Files
              </button>
              <button
                className={`px-5 py-2.5 font-medium text-sm rounded-t-lg flex items-center gap-2 transition-all ${
                  activeTab === 'options'
                    ? 'bg-[#1A1B2E] text-[#bd93f9] border-t border-l border-r border-[#2A2C42]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('options')}
              >
                <Settings size={18} />
                Options
              </button>
              <button
                className={`px-5 py-2.5 font-medium text-sm rounded-t-lg flex items-center gap-2 transition-all ${
                  activeTab === 'tasks'
                    ? 'bg-[#1A1B2E] text-[#ff79c6] border-t border-l border-r border-[#2A2C42]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('tasks')}
              >
                <List size={18} />
                Tasks
              </button>
            </div>

            {/* Tab Panels */}
            <div className="bg-[#1A1B2E] rounded-xl border border-[#2A2C42] p-5 shadow-lg">
              {/* 1) Files Panel */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  {/* File Tree + Search (already integrated in FileTreeView if you add it) */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#8be9fd]">Project Files</h3>
                    <div className="flex items-center space-x-2">
                      {/* Example search or refresh button here if desired */}
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="(Example) Filter files..."
                          className="pl-9 pr-4 py-1.5 bg-[#141527] border border-[#3f4257] rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd93f9] transition-all w-48"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  {/* FileTreeView */}
                  <div className="bg-[#141527] rounded-lg border border-[#2A2C42] p-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {fileTree.length === 0 && !isLoadingTree && projectPath ? (
                      <p className="text-gray-400">No files found in this directory.</p>
                    ) : isLoadingTree ? (
                      <p className="text-gray-400 animate-pulse">Loading tree...</p>
                    ) : (
                      <FileTreeView
                        tree={fileTree}
                        onSelectFiles={handleSelectFiles}
                        filterExtensions={filterExtensions}
                      />
                    )}
                  </div>

                  {/* Selected Files */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#f1fa8c] mb-3">Selected Files</h3>
                    <div className="bg-[#141527] rounded-lg border border-[#2A2C42] p-3">
                      <SelectedFilesListView
                        selectedFiles={selectedFiles}
                        filterExtensions={filterExtensions}
                        filesData={filesData}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2) Options Panel */}
              {activeTab === 'options' && (
                <div className="space-y-4">
                  {/* Exclusions */}
                  <ExclusionsManagerView
                    excludedPaths={excludedPaths}
                    onUpdateExclusions={updateExclusions}
                  />

                  {/* Extensions Filter */}
                  <div className="bg-[#141527] p-3 rounded border border-[#2A2C42] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300 font-medium">Filter by Extensions:</label>
                      {filterExtensions.length > 0 && (
                        <button
                          onClick={handleClearExtensions}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={extensionInput}
                        onChange={e => setExtensionInput(e.target.value)}
                        placeholder="e.g. .js, .tsx"
                        className="flex-1 bg-[#12131C] text-gray-100 border border-[#3f4257] 
                                   rounded px-2 py-1 text-sm focus:outline-none focus:border-[#7b93fd]"
                      />
                      <button
                        onClick={handleAddExtension}
                        className="px-3 py-1 bg-[#50fa7b] hover:bg-[#7b93fd] rounded text-sm font-medium text-[#141527]"
                      >
                        Add
                      </button>
                    </div>

                    {filterExtensions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filterExtensions.map(ext => (
                          <span
                            key={ext}
                            className="inline-flex items-center px-2 py-1 rounded bg-[#3C3F57] text-sm text-gray-100"
                          >
                            {ext}
                            <button
                              onClick={() => handleRemoveExtension(ext)}
                              className="ml-2 text-gray-300 hover:text-gray-100"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs italic">No extension filters set.</p>
                    )}
                  </div>
                </div>
              )}

              {/* 3) Tasks Panel */}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#ff79c6]">Todo List</h3>
                  <TodoListView />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* InstructionsInputView */}
            <div className="bg-[#1A1B2E] rounded-xl border border-[#2A2C42] p-5 shadow-lg">
              <InstructionsInputView
                metaPrompt={metaPrompt}
                setMetaPrompt={setMetaPrompt}
                mainInstructions={mainInstructions}
                setMainInstructions={setMainInstructions}
                metaPromptFiles={metaPromptFiles}
                selectedMetaFile={selectedMetaFile}
                setSelectedMetaFile={setSelectedMetaFile}
                onLoadMetaPrompt={loadMetaPrompt}
                onSaveMetaPrompt={saveMetaPrompt}
                newMetaFileName={newMetaFileName}
                setNewMetaFileName={setNewMetaFileName}
                onRefreshMetaList={fetchMetaPromptList}
              />
            </div>

            {/* CopyButtonView */}
            <div className="bg-[#1A1B2E] rounded-xl border border-[#2A2C42] p-5 shadow-lg flex justify-center">
              <CopyButtonView
                metaPrompt={metaPrompt}
                mainInstructions={mainInstructions}
                selectedFiles={selectedFiles}
                filesData={filesData}
                tree={fileTree}
                excludedPaths={excludedPaths}
                filterExtensions={filterExtensions}
                onFetchLatestFileData={fetchLatestFileData}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
