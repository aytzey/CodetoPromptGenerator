// pages/index.tsx

import React, { useState, useEffect } from 'react'
import Head from 'next/head'

// Import components directly - not dynamically
import FileTreeView from '../views/FileTreeView'
import InstructionsInputView from '../views/InstructionsInputView'
import CopyButtonView from '../views/CopyButtonView'
import SelectedFilesListView from '../views/SelectedFilesListView'
import FolderPickerView from '../views/FolderPickerView'
import ExclusionsManagerView from '../views/ExclusionsManagerView'
import TodoListView from '../views/TodoListView'
import TestButtonView from '../views/TestButtonView' // Added for debugging

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
  // State for file tree and selection
  const [projectPath, setProjectPath] = useState<string>('')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filesData, setFilesData] = useState<FileData[]>([])
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false)
  
  // State for exclusions
  const [excludedPaths, setExcludedPaths] = useState<string[]>([])

  // State for prompt inputs
  const [metaPrompt, setMetaPrompt] = useState<string>('')
  const [mainInstructions, setMainInstructions] = useState<string>('')
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([])
  const [selectedMetaFile, setSelectedMetaFile] = useState<string>('')
  const [newMetaFileName, setNewMetaFileName] = useState<string>('')

  // State for filter settings
  const [filterExtensions, setFilterExtensions] = useState<string[]>([])
  const [extensionInput, setExtensionInput] = useState<string>('')
  
  // UI state
  const [activeTab, setActiveTab] = useState<'files' | 'options' | 'tasks'>('files')
  const [darkMode, setDarkMode] = useState<boolean>(true)

  // Load exclusions on mount
  useEffect(() => {
    fetchExclusions()
    fetchMetaPromptList()
  }, [])

  // Load project tree when path changes
  useEffect(() => {
    if (projectPath) {
      loadProjectTree()
    }
  }, [projectPath, excludedPaths])

  // Load file contents when selection changes
  useEffect(() => {
    if (selectedFiles.length > 0) {
      loadSelectedFileContents()
    } else {
      setFilesData([])
    }
  }, [selectedFiles])

  // Fetch the list of excluded paths
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

  // Update the excluded paths
  const updateExclusions = async (paths: string[]) => {
    try {
      const response = await fetch('/api/exclusions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ exclusions: paths })
      })
      const data = await response.json()
      if (data.success) {
        setExcludedPaths(data.exclusions || [])
        // Reload the project tree to apply the new exclusions
        if (projectPath) {
          loadProjectTree()
        }
      }
    } catch (error) {
      console.error('Error updating exclusions:', error)
      throw error // Let the calling component handle the error
    }
  }

  // Load the project file tree
  const loadProjectTree = async () => {
    if (!projectPath) return
    
    setIsLoadingTree(true)
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

  // Load the contents of selected files
  const loadSelectedFileContents = async () => {
    try {
      const response = await fetch('/api/files/contents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: projectPath,
          files: selectedFiles.filter(path => !path.endsWith('/'))
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

  // Fetch the list of meta prompts
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

  // Load a meta prompt
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

  // Save a meta prompt
  const saveMetaPrompt = async () => {
    if (!metaPrompt.trim()) return
    
    const fileName = newMetaFileName.trim() || selectedMetaFile || `meta_${new Date().getTime()}.txt`
    
    try {
      const response = await fetch('/api/metaprompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName,
          content: metaPrompt
        })
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

  // Handle file selection
  const handleSelectFiles = (paths: string[]) => {
    setSelectedFiles(paths)
  }

  // Add a filter extension
  const handleAddExtension = () => {
    if (!extensionInput.trim()) return
    
    // Make sure it starts with a dot
    let ext = extensionInput.trim()
    if (!ext.startsWith('.')) {
      ext = `.${ext}`
    }
    
    if (!filterExtensions.includes(ext)) {
      setFilterExtensions(prev => [...prev, ext])
    }
    
    setExtensionInput('')
  }

  // Remove a filter extension
  const handleRemoveExtension = (ext: string) => {
    setFilterExtensions(prev => prev.filter(e => e !== ext))
  }

  // Clear all filter extensions
  const handleClearExtensions = () => {
    setFilterExtensions([])
  }

  // Fetch latest file data for the copy button
  const fetchLatestFileData = async (): Promise<FileData[]> => {
    try {
      const response = await fetch('/api/files/contents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: projectPath,
          files: selectedFiles.filter(path => !path.endsWith('/'))
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

  return (
    <div className={darkMode ? 'bg-[#12131C] min-h-screen' : 'bg-gray-100 min-h-screen'}>
      <Head>
        <title>Code to Prompt Generator</title>
        <meta name="description" content="Generate LLM prompts from your code" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#50fa7b]">Code to Prompt Generator</h1>
          
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-[#282A36] hover:bg-[#3C3F57] text-gray-100"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
        
        {/* Project Folder Picker */}
        <div className="mt-4">
          <FolderPickerView
            currentPath={projectPath}
            onPathSelected={setProjectPath}
            isLoading={isLoadingTree}
          />
        </div>

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-[#3C3F57]">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'text-[#50fa7b] border-b-2 border-[#50fa7b]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('files')}
              >
                Files
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'options'
                    ? 'text-[#50fa7b] border-b-2 border-[#50fa7b]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('options')}
              >
                Options
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'text-[#50fa7b] border-b-2 border-[#50fa7b]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                onClick={() => setActiveTab('tasks')}
              >
                Tasks
              </button>
            </div>

            {/* Tab Panels */}
            <div>
              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="space-y-4">
                  {fileTree.length > 0 ? (
                    <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] max-h-96 overflow-y-auto scrollbar-thin">
                      <FileTreeView
                        tree={fileTree}
                        onSelectFiles={handleSelectFiles}
                        filterExtensions={filterExtensions}
                      />
                    </div>
                  ) : (
                    <div className="bg-[#1e1f29] p-4 rounded border border-[#3f4257] text-center">
                      {isLoadingTree ? (
                        <p className="text-gray-300">Loading project tree...</p>
                      ) : projectPath ? (
                        <p className="text-gray-300">No files found in the selected directory</p>
                      ) : (
                        <p className="text-gray-300">Select a project folder to view files</p>
                      )}
                    </div>
                  )}

                  <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257]">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Selected Files</h3>
                    <SelectedFilesListView
                      selectedFiles={selectedFiles}
                      filterExtensions={filterExtensions}
                      filesData={filesData}
                    />
                  </div>
                </div>
              )}

              {/* Options Tab */}
              {activeTab === 'options' && (
                <div className="space-y-4">
                  {/* Exclusions Manager */}
                  <ExclusionsManagerView
                    excludedPaths={excludedPaths}
                    onUpdateExclusions={updateExclusions}
                  />

                  {/* Extensions Filter */}
                  <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-300 font-medium">
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
                        onChange={(e) => setExtensionInput(e.target.value)}
                        placeholder="e.g. .js, .tsx, etc."
                        className="flex-1 bg-[#12131C] text-gray-100 border border-[#3f4257] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#7b93fd]"
                      />
                      <button
                        onClick={handleAddExtension}
                        className="px-3 py-1 bg-[#50fa7b] hover:bg-[#7b93fd] rounded text-sm font-medium text-[#1e1f29]"
                      >
                        Add
                      </button>
                    </div>

                    {filterExtensions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filterExtensions.map((ext) => (
                          <span
                            key={ext}
                            className="inline-flex items-center px-2 py-1 rounded bg-[#3C3F57] text-sm"
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
                        No extension filters. All files will be shown.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257]">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Todo List</h3>
                  <TodoListView />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-4 space-y-6">
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

            <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] flex justify-center">
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