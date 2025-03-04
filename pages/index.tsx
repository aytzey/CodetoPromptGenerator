// pages/index.tsx

import React, { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import {
  Settings,
  FileCode,
  List,
  Sun,
  Moon,
  Github,
  Search
} from 'lucide-react'

import FileTreeView from '../views/FileTreeView'
import InstructionsInputView from '../views/InstructionsInputView'
import CopyButtonView from '../views/CopyButtonView'
import SelectedFilesListView from '../views/SelectedFilesListView'
import FolderPickerView from '../views/FolderPickerView'
import ExclusionsManagerView from '../views/ExclusionsManagerView'
import TodoListView from '../views/TodoListView'

import {
  FileNode,
  applyExtensionFilter,
  applySearchFilter,
  flattenTree
} from '../lib/fileFilters'

interface FileData {
  path: string
  content: string
  tokenCount: number
}

// Change the base URL to match your Flask backend:
const BACKEND_URL = 'http://localhost:5000'

export default function Home() {
  const [projectPath, setProjectPath] = useState<string>('')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filesData, setFilesData] = useState<FileData[]>([])
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false)
  const [excludedPaths, setExcludedPaths] = useState<string[]>([])

  const [metaPrompt, setMetaPrompt] = useState<string>('')
  const [mainInstructions, setMainInstructions] = useState<string>('')
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([])
  const [selectedMetaFile, setSelectedMetaFile] = useState<string>('')
  const [newMetaFileName, setNewMetaFileName] = useState<string>('')

  const [filterExtensions, setFilterExtensions] = useState<string[]>([])
  const [extensionInput, setExtensionInput] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'files' | 'options' | 'tasks'>('files')
  const [darkMode, setDarkMode] = useState<boolean>(true)
  const [fileSearchTerm, setFileSearchTerm] = useState<string>('')

  useEffect(() => {
    fetchExclusions()
    fetchMetaPromptList()
  }, [])

  useEffect(() => {
    if (projectPath) {
      loadProjectTree()
    }
  }, [projectPath, excludedPaths])

  useEffect(() => {
    if (selectedFiles.length > 0) {
      loadSelectedFileContents()
    } else {
      setFilesData([])
    }
  }, [selectedFiles])

  // --------------------  Fetch from Python backend  -------------------- //

  const fetchExclusions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/exclusions`)
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
      const response = await fetch(`${BACKEND_URL}/api/exclusions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclusions: paths })
      })
      const data = await response.json()
      if (data.success) {
        setExcludedPaths(data.exclusions || [])
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
      const response = await fetch(`${BACKEND_URL}/api/files`, {
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
      const response = await fetch(`${BACKEND_URL}/api/files/contents`, {
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

  // ---------- Meta Prompts -----------
  const fetchMetaPromptList = async () => {
    try {
      // We do ?action=list as used in the new python route
      const response = await fetch(`${BACKEND_URL}/api/metaprompts?action=list`)
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
      const response = await fetch(
        `${BACKEND_URL}/api/metaprompts?action=load&file=${encodeURIComponent(selectedMetaFile)}`
      )
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
      const response = await fetch(`${BACKEND_URL}/api/metaprompts`, {
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
  // --------------------------------------------------------------------- //

  const handleSelectFiles = (paths: string[]) => {
    setSelectedFiles(paths)
  }

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

  const handleSelectAll = () => {
    const allPaths = flattenTree(filteredTree)
    setSelectedFiles(allPaths)
  }

  const handleDeselectAll = () => {
    setSelectedFiles([])
  }

  const fetchLatestFileData = async (): Promise<FileData[]> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/contents`, {
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

  // Filter the file tree locally
  const filteredTree = useMemo(() => {
    const afterExtFilter = filterExtensions.length
      ? applyExtensionFilter(fileTree, filterExtensions)
      : fileTree

    if (!fileSearchTerm.trim()) {
      return afterExtFilter
    }
    return applySearchFilter(afterExtFilter, fileSearchTerm.toLowerCase())
  }, [fileTree, filterExtensions, fileSearchTerm])

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-100 dark:bg-gradient-to-br dark:from-[#141527] dark:to-[#0B0C1B]">
        <Head>
          <title>CodeToPromptGenerator</title>
          <meta name="description" content="Generate LLM prompts from your code" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* Header */}
        <header
          className={`
            sticky top-0 z-10 px-6 py-4 shadow-lg border-b
            bg-white dark:bg-[#1A1B2E]
            border-gray-300 dark:border-[#2A2C42]
          `}
        >
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1
                className="
                  text-2xl font-bold bg-gradient-to-r from-[#8be9fd] to-[#50fa7b]
                  text-transparent bg-clip-text
                "
              >
                Code to LLM Prompt Generator by Aytzey
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`
                  p-2 rounded-full shadow-md transition-all duration-300
                  bg-gray-200 hover:bg-gray-300 text-gray-800
                  dark:bg-[#282A36] dark:hover:bg-[#3C3F57] dark:text-gray-100
                `}
              >
                {darkMode ? (
                  <Moon size={20} className="dark:text-[#8be9fd]" />
                ) : (
                  <Sun size={20} className="text-yellow-500" />
                )}
              </button>
              <button
                onClick={() => window.open('https://github.com/aytzey/CodetoPromptGenerator', '_blank')}
                className={`
                  flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium shadow-md
                  transition-all duration-300
                  bg-gray-300 hover:bg-green-400 text-gray-800
                  dark:bg-[#3C3F57] dark:hover:bg-[#50fa7b] dark:hover:text-[#282A36] dark:text-gray-100
                `}
              >
                <Github size={16} />
                <span>GitHub</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="container mx-auto px-6 pt-6 pb-10">
          <div
            className={`
              rounded-xl border p-4 shadow-lg
              bg-white dark:bg-[#1A1B2E]
              border-gray-300 dark:border-[#2A2C42]
            `}
          >
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={setProjectPath}
              isLoading={isLoadingTree}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="flex items-center border-b pb-1 border-gray-300 dark:border-[#2A2C42]">
                <button
                  className={`
                    px-5 py-2.5 font-medium text-sm rounded-t-lg flex items-center gap-2 transition-all
                    ${
                      activeTab === 'files'
                        ? 'bg-white dark:bg-[#1A1B2E] text-green-600 dark:text-[#50fa7b] border border-b-0 border-gray-300 dark:border-[#2A2C42]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                  `}
                  onClick={() => setActiveTab('files')}
                >
                  <FileCode size={18} />
                  Files
                </button>
                <button
                  className={`
                    px-5 py-2.5 font-medium text-sm rounded-t-lg flex items-center gap-2 transition-all
                    ${
                      activeTab === 'options'
                        ? 'bg-white dark:bg-[#1A1B2E] text-purple-600 dark:text-[#bd93f9] border border-b-0 border-gray-300 dark:border-[#2A2C42]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                  `}
                  onClick={() => setActiveTab('options')}
                >
                  <Settings size={18} />
                  Options
                </button>
                <button
                  className={`
                    px-5 py-2.5 font-medium text-sm rounded-t-lg flex items-center gap-2 transition-all
                    ${
                      activeTab === 'tasks'
                        ? 'bg-white dark:bg-[#1A1B2E] text-pink-600 dark:text-[#ff79c6] border border-b-0 border-gray-300 dark:border-[#2A2C42]'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                  `}
                  onClick={() => setActiveTab('tasks')}
                >
                  <List size={18} />
                  Tasks
                </button>
              </div>

              <div
                className={`
                  rounded-xl border p-5 shadow-lg
                  bg-white dark:bg-[#1A1B2E]
                  border-gray-300 dark:border-[#2A2C42]
                `}
              >
                {activeTab === 'files' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-blue-600 dark:text-[#8be9fd]">
                        Project Files
                      </h3>
                      <div className="flex items-center space-x-2">
                        {/* SEARCH FIELD */}
                        <div className="relative">
                          <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Filter files..."
                            value={fileSearchTerm}
                            onChange={e => setFileSearchTerm(e.target.value)}
                            className={`
                              pl-9 pr-4 py-1.5 rounded-lg text-sm
                              bg-gray-100 dark:bg-[#141527]
                              border border-gray-300 dark:border-[#3f4257]
                              text-gray-800 dark:text-gray-100
                              focus:outline-none focus:ring-1 focus:ring-[#bd93f9] transition-all w-48
                            `}
                          />
                        </div>

                        {/* REFRESH BUTTON: triggers re-fetch of file tree */}
                        <button
                          onClick={() => loadProjectTree()}
                          disabled={isLoadingTree || !projectPath}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingTree ? 'Refreshing...' : 'Refresh'}
                        </button>

                        <button
                          onClick={handleSelectAll}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white"
                        >
                          Select All
                        </button>
                        <button
                          onClick={handleDeselectAll}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div
                      className={`
                        rounded-lg p-3 max-h-96 overflow-y-auto custom-scrollbar
                        bg-gray-50 dark:bg-[#141527]
                        border border-gray-300 dark:border-[#2A2C42]
                      `}
                    >
                      {fileTree.length === 0 && !isLoadingTree && projectPath ? (
                        <p className="text-gray-400">
                          No files found in this directory.
                        </p>
                      ) : isLoadingTree ? (
                        <p className="text-gray-400 animate-pulse">Loading tree...</p>
                      ) : (
                        <FileTreeView
                          tree={filteredTree}
                          selectedFiles={selectedFiles}
                          onSelectFiles={handleSelectFiles}
                        />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-yellow-600 dark:text-[#f1fa8c]">
                        Selected Files
                      </h3>
                      <div
                        className={`
                          rounded-lg p-3
                          bg-gray-50 dark:bg-[#141527]
                          border border-gray-300 dark:border-[#2A2C42]
                        `}
                      >
                        <SelectedFilesListView
                          selectedFiles={selectedFiles}
                          filterExtensions={filterExtensions}
                          filesData={filesData}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'options' && (
                  <div className="space-y-4">
                    <ExclusionsManagerView
                      excludedPaths={excludedPaths}
                      onUpdateExclusions={updateExclusions}
                    />

                    <div
                      className={`
                        p-3 rounded border space-y-2
                        bg-gray-50 dark:bg-[#141527]
                        border-gray-300 dark:border-[#2A2C42]
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Filter by Extensions:
                        </label>
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
                          className={`
                            flex-1 rounded px-2 py-1 text-sm focus:outline-none
                            bg-gray-100 dark:bg-[#12131C]
                            border border-gray-300 dark:border-[#3f4257]
                            text-gray-800 dark:text-gray-100
                          `}
                        />
                        <button
                          onClick={handleAddExtension}
                          className={`
                            px-3 py-1 rounded text-sm font-medium
                            bg-green-400 hover:bg-blue-400 text-gray-800
                            dark:bg-[#50fa7b] dark:hover:bg-[#7b93fd] dark:text-[#141527]
                          `}
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
                        <p className="text-gray-400 text-xs italic">
                          No extension filters set.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-pink-600 dark:text-[#ff79c6]">
                      Todo List
                    </h3>
                    <TodoListView />
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel */}
            <div className="space-y-6">
              <div
                className={`
                  rounded-xl border p-5 shadow-lg
                  bg-white dark:bg-[#1A1B2E]
                  border-gray-300 dark:border-[#2A2C42]
                `}
              >
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

              <div
                className={`
                  rounded-xl border p-5 shadow-lg flex justify-center
                  bg-white dark:bg-[#1A1B2E]
                  border-gray-300 dark:border-[#2A2C42]
                `}
              >
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
    </div>
  )
}
