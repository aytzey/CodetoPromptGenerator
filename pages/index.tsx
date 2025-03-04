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
  Search,
  RefreshCw,
  CheckSquare,
  XSquare,
  Code,
  LayoutGrid,
  Zap,
  Flame,
  BookOpen,
  Terminal,
  HelpCircle,
  Rocket,
  Coffee,
  X,
  Folder,
  BarChart2
} from 'lucide-react'

import FileTreeView from '../views/FileTreeView'
import InstructionsInputView from '../views/InstructionsInputView'
import CopyButtonView from '../views/CopyButtonView'
import SelectedFilesListView from '../views/SelectedFilesListView'
import FolderPickerView from '../views/FolderPickerView'
import ExclusionsManagerView from '../views/ExclusionsManagerView'
import LocalExclusionsManagerView from '../views/LocalExclusionsManagerView'
import TodoListView from '../views/TodoListView'

import {
  FileNode,
  applyExtensionFilter,
  applySearchFilter,
  flattenTree
} from '../lib/fileFilters'

// shadcn/ui
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

interface FileData {
  path: string
  content: string
  tokenCount: number
}

// Adjust to your actual backend URL
const BACKEND_URL = 'http://localhost:5000'

/**
 * Helper to get all descendant paths (files & subfolders) under a given node path.
 */
function getAllDescendantsOfPath(tree: FileNode[], targetPath: string): string[] {
  const normTarget = targetPath.replace(/\\/g, '/')
  const allNodes = flattenTree(tree) // each entry is a relative path

  const results: string[] = []
  for (const p of allNodes) {
    if (p === normTarget || p.startsWith(normTarget + '/')) {
      results.push(p)
    }
  }
  return results
}

export default function Home() {
  const [projectPath, setProjectPath] = useState<string>('')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filesData, setFilesData] = useState<FileData[]>([])
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false)

  // Global (ignoreDirs.txt) + local project exclusions
  const [excludedPaths, setExcludedPaths] = useState<string[]>([])
  const [localExcludedPaths, setLocalExcludedPaths] = useState<string[]>([])

  // Meta prompt
  const [metaPrompt, setMetaPrompt] = useState<string>('')
  const [mainInstructions, setMainInstructions] = useState<string>('')
  const [metaPromptFiles, setMetaPromptFiles] = useState<string[]>([])
  const [selectedMetaFile, setSelectedMetaFile] = useState<string>('')
  const [newMetaFileName, setNewMetaFileName] = useState<string>('')

  // Extension filters
  const [filterExtensions, setFilterExtensions] = useState<string[]>([])
  const [extensionInput, setExtensionInput] = useState<string>('')

  // UI states
  const [activeTab, setActiveTab] = useState<'files' | 'options' | 'tasks'>('files')
  const [darkMode, setDarkMode] = useState<boolean>(true)
  const [fileSearchTerm, setFileSearchTerm] = useState<string>('')

  // Show welcome only if user hasn't hidden it
  const [showWelcome, setShowWelcome] = useState<boolean>(true)

  // Global error
  const [error, setError] = useState<string | null>(null)

  // ---------------------------
  //  Load from localStorage
  // ---------------------------
  useEffect(() => {
    // Retrieve last project path
    const storedPath = localStorage.getItem('lastProjectPath') || ''
    if (storedPath) {
      setProjectPath(storedPath)
    }

    // Retrieve welcome screen preference
    const welcomeHidden = localStorage.getItem('hideWelcomeScreen')
    if (welcomeHidden === 'true') {
      setShowWelcome(false)
    }
  }, [])

  // -------------------------------------------
  //  Fetch global exclusions & metaPrompt list
  // -------------------------------------------
  useEffect(() => {
    fetchExclusions()
    fetchMetaPromptList()
  }, [])

  // -------------------------------------------
  //  Load project tree whenever projectPath changes
  // -------------------------------------------
  useEffect(() => {
    if (projectPath) {
      loadProjectTree()
      setShowWelcome(false)
      localStorage.setItem('lastProjectPath', projectPath) // store path
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, excludedPaths])

  // -------------------------------------------
  //  Re-fetch file contents when selection changes
  // -------------------------------------------
  useEffect(() => {
    if (selectedFiles.length > 0) {
      loadSelectedFileContents()
    } else {
      setFilesData([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles])

  // ------------------------------
  //  Global Exclusions
  // ------------------------------
  async function fetchExclusions() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/exclusions`)
      const data = await response.json()
      if (data.success) {
        setExcludedPaths(data.exclusions || [])
      }
    } catch (err) {
      console.error('Error fetching exclusions:', err)
      setError(
        'Failed to connect to backend. Ensure Flask server is running at ' + BACKEND_URL
      )
    }
  }

  async function updateExclusions(paths: string[]) {
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
    } catch (err) {
      console.error('Error updating exclusions:', err)
      setError('Failed to update global exclusions. Check backend connection.')
      throw err
    }
  }

  // ------------------------------
  //  Load project tree
  // ------------------------------
  async function loadProjectTree() {
    if (!projectPath) return
    setIsLoadingTree(true)
    setError(null)
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
        console.error('loadProjectTree:', data.error)
        setError('Could not load project tree: ' + data.error)
      }
    } catch (err) {
      console.error('loadProjectTree: network error', err)
      setError('Network error loading project tree. Check your backend server.')
    } finally {
      setIsLoadingTree(false)
    }
  }

  // ------------------------------
  //  Load selected files’ contents
  // ------------------------------
  async function loadSelectedFileContents() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath,
          files: selectedFiles.filter((p) => !p.endsWith('/'))
        })
      })
      const data = await response.json()
      if (data.success) {
        setFilesData(data.filesData || [])
      }
    } catch (err) {
      console.error('loadSelectedFileContents error:', err)
      setError('Failed to load file contents.')
    }
  }

  // ------------------------------
  //  Meta Prompt Management
  // ------------------------------
  async function fetchMetaPromptList() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/metaprompts?action=list`)
      const data = await response.json()
      if (data.success) {
        setMetaPromptFiles(data.files || [])
      }
    } catch (err) {
      console.error('fetchMetaPromptList error:', err)
    }
  }

  async function loadMetaPrompt() {
    if (!selectedMetaFile) return
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/metaprompts?action=load&file=${encodeURIComponent(selectedMetaFile)}`
      )
      const data = await response.json()
      if (data.success) {
        setMetaPrompt(data.content || '')
      }
    } catch (err) {
      console.error('loadMetaPrompt error:', err)
      setError('Failed to load meta prompt file.')
    }
  }

  async function saveMetaPrompt() {
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
    } catch (err) {
      console.error('saveMetaPrompt error:', err)
      setError('Failed to save meta prompt.')
    }
  }

  // ------------------------------
  //  File selection & filters
  // ------------------------------
  function handleSelectFiles(paths: string[]) {
    setSelectedFiles(paths)
  }

  function handleAddExtension() {
    const trimmed = extensionInput.trim()
    if (!trimmed) return
    let ext = trimmed
    if (!ext.startsWith('.')) {
      ext = `.${ext}`
    }
    if (!filterExtensions.includes(ext)) {
      setFilterExtensions((prev) => [...prev, ext])
    }
    setExtensionInput('')
  }

  function handleRemoveExtension(ext: string) {
    setFilterExtensions((prev) => prev.filter((e) => e !== ext))
  }

  function handleClearExtensions() {
    setFilterExtensions([])
  }

  function handleSelectAll() {
    const allPaths = flattenTree(filteredTree)
    const allExcluded = new Set<string>()

    for (const ex of localExcludedPaths) {
      const desc = getAllDescendantsOfPath(filteredTree, ex)
      for (const d of desc) {
        allExcluded.add(d)
      }
    }
    const finalPaths = allPaths.filter((p) => !allExcluded.has(p))
    setSelectedFiles(finalPaths)
  }

  function handleDeselectAll() {
    setSelectedFiles([])
  }

  // ------------------------------
  //  Refresh: Update tree and selected file contents
  // ------------------------------
  async function refreshAll() {
    await loadProjectTree()
    if (selectedFiles.length > 0) {
      await loadSelectedFileContents()
    }
  }

  // ------------------------------
  //  Fetch latest file data and update global state
  // ------------------------------
  async function fetchLatestFileData(): Promise<FileData[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath,
          files: selectedFiles.filter((p) => !p.endsWith('/'))
        })
      })
      const data = await response.json()
      if (data.success) {
        setFilesData(data.filesData || [])
        return data.filesData || []
      }
      return []
    } catch (err) {
      console.error('fetchLatestFileData error:', err)
      setError('Failed to fetch latest file data.')
      return []
    }
  }

  // ------------------------------
  //  Filtered tree computation
  // ------------------------------
  const filteredTree = useMemo(() => {
    const afterExtFilter = filterExtensions.length
      ? applyExtensionFilter(fileTree, filterExtensions)
      : fileTree

    if (!fileSearchTerm.trim()) {
      return afterExtFilter
    }
    return applySearchFilter(afterExtFilter, fileSearchTerm.toLowerCase())
  }, [fileTree, filterExtensions, fileSearchTerm])

  function handleLocalExclusionsChange(newList: string[]) {
    setLocalExcludedPaths(newList)
  }

  // Some summary stats
  const fileCount = selectedFiles.filter((f) => !f.endsWith('/')).length
  const totalTokens = filesData.reduce((acc, file) => acc + file.tokenCount, 0)
  const hasContent = metaPrompt.trim() || mainInstructions.trim() || fileCount > 0

  // Dismiss the welcome screen permanently
  function dismissWelcomeScreen() {
    setShowWelcome(false)
    localStorage.setItem('hideWelcomeScreen', 'true')
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 transition-colors duration-200">
        <Head>
          <title>Code to Prompt Generator</title>
          <meta name="description" content="Generate LLM prompts from your code" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        {/* Header */}
        <header
          className="
            sticky top-0 z-10 px-6 py-4 shadow-md border-b
            bg-white/95 backdrop-blur-sm dark:bg-gray-900/95
            border-gray-200 dark:border-gray-800
            transition-all duration-200
          "
        >
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-lg shadow-md">
                <Code size={24} className="text-white" />
              </div>
              <div>
                <h1
                  className="
                    text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500
                    text-transparent bg-clip-text
                  "
                >
                  Code to LLM Prompt Generator
                </h1>
                <div className="flex items-center mt-0.5">
                  <Badge variant="outline" className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    v1.0
                  </Badge>
                  <span className="mx-2 text-gray-400 dark:text-gray-600">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">by Aytzey</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDarkMode(!darkMode)}
                      className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {darkMode ? (
                        <Sun size={20} className="text-amber-400" />
                      ) : (
                        <Moon size={20} className="text-indigo-600" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{darkMode ? 'Switch to light mode' : 'Switch to dark mode'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950 transition-colors"
                      onClick={() => window.open('https://github.com/aytzey/CodetoPromptGenerator', '_blank')}
                    >
                      <Github size={16} className="mr-2 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-indigo-700 dark:text-indigo-300">GitHub</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>View project on GitHub</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="container mx-auto px-6 pt-6 pb-10">
          {error && (
            <Alert
              variant="destructive"
              className="mb-6 bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300"
            >
              <AlertDescription className="flex items-center">
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 p-0 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-transparent"
                  onClick={() => setError(null)}
                >
                  <X size={16} />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Folder Picker */}
          <Card className="shadow-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Folder size={18} className="text-indigo-500 dark:text-indigo-400" />
                Project Selection
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Choose a project folder to generate prompts from
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <FolderPickerView
                currentPath={projectPath}
                onPathSelected={setProjectPath}
                isLoading={isLoadingTree}
              />
            </CardContent>
          </Card>

          {showWelcome && !projectPath ? (
            <Card className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-indigo-100 dark:border-indigo-900/50 shadow-lg overflow-hidden">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg mb-6">
                    <Rocket size={40} className="text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                    Welcome to Code to Prompt Generator
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                    Transform your code into structured prompts for large language models. Simply
                    select a project folder to get started.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-md mr-3">
                        <Terminal size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        Select Code Files
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Browse and select the files from your project you want to include in your
                      prompt.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-md mr-3">
                        <BookOpen size={24} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        Add Instructions
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Customize your prompt with meta-information and specific instructions for the
                      LLM.
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-green-100 dark:bg-green-950 rounded-md mr-3">
                        <Zap size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        Generate &amp; Copy
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Generate a well-structured prompt and copy it directly to your clipboard for
                      use with any LLM.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                  <Button
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg px-8 py-6 h-auto text-lg"
                    onClick={() => document.querySelector('input')?.focus()}
                  >
                    <Folder size={20} className="mr-2" />
                    Select a Project Folder to Begin
                  </Button>
                  <Button
                    variant="outline"
                    onClick={dismissWelcomeScreen}
                    className="border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Don’t Show Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel */}
              <div className="lg:col-span-2 space-y-6">
                <Tabs
                  value={activeTab}
                  onValueChange={(val) => setActiveTab(val as 'files' | 'options' | 'tasks')}
                  className="w-full"
                >
                  <TabsList className="w-full bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <TabsTrigger
                      value="files"
                      className="
                        flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg
                        data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900
                        data-[state=active]:shadow-sm transition-all
                      "
                    >
                      <FileCode size={18} /> Files
                    </TabsTrigger>
                    <TabsTrigger
                      value="options"
                      className="
                        flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg
                        data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900
                        data-[state=active]:shadow-sm transition-all
                      "
                    >
                      <Settings size={18} /> Options
                    </TabsTrigger>
                    <TabsTrigger
                      value="tasks"
                      className="
                        flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg
                        data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900
                        data-[state=active]:shadow-sm transition-all
                      "
                    >
                      <List size={18} /> Tasks
                    </TabsTrigger>
                  </TabsList>

                  {/* FILES TAB */}
                  <TabsContent
                    value="files"
                    className="border rounded-xl p-5 bg-white dark:bg-gray-900 shadow-md mt-4 border-gray-200 dark:border-gray-800"
                  >
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                          <FileCode size={20} />
                          Project Files
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <Input
                              placeholder="Filter files..."
                              value={fileSearchTerm}
                              onChange={(e) => setFileSearchTerm(e.target.value)}
                              className="
                                pl-9 pr-4 py-1.5 w-full sm:w-48 bg-gray-50 dark:bg-gray-800
                                border-gray-200 dark:border-gray-700 focus:ring-2
                                focus:ring-indigo-500 focus:border-transparent
                              "
                            />
                          </div>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                                  onClick={refreshAll}
                                  disabled={isLoadingTree || !projectPath}
                                >
                                  <RefreshCw
                                    size={16}
                                    className={`mr-1 ${isLoadingTree ? 'animate-spin' : ''}`}
                                  />
                                  {isLoadingTree ? 'Refreshing...' : 'Refresh'}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Refresh the file tree and selected file contents</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <Button
                            size="sm"
                            variant="outline"
                            className="
                              border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950
                              dark:text-teal-400
                            "
                            onClick={handleSelectAll}
                          >
                            <CheckSquare size={16} className="mr-1" />
                            Select All
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="
                              border-rose-500 text-rose-600 hover:bg-rose-50
                              dark:hover:bg-rose-950 dark:text-rose-400
                            "
                            onClick={handleDeselectAll}
                          >
                            <XSquare size={16} className="mr-1" />
                            Deselect All
                          </Button>
                        </div>
                      </div>

                      <div
                        className="
                          rounded-lg p-3 max-h-96 overflow-y-auto border border-gray-200
                          dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shadow-inner
                        "
                      >
                        {fileTree.length === 0 && !isLoadingTree && projectPath ? (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <FileCode size={40} className="mb-2 opacity-50" />
                            <p>No files found in this directory.</p>
                          </div>
                        ) : isLoadingTree ? (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <RefreshCw size={40} className="mb-2 opacity-50 animate-spin" />
                            <p className="animate-pulse">Loading file tree...</p>
                          </div>
                        ) : (
                          <FileTreeView
                            tree={filteredTree}
                            selectedFiles={selectedFiles}
                            onSelectFiles={handleSelectFiles}
                          />
                        )}
                      </div>

                      {/* Selected Files */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-teal-600 dark:text-teal-400 flex items-center gap-2">
                          <CheckSquare size={20} />
                          Selected Files
                          {selectedFiles.length > 0 && (
                            <Badge className="ml-2 bg-teal-500 text-white font-normal">
                              {selectedFiles.length} files
                            </Badge>
                          )}
                        </h3>
                        <div
                          className="
                            rounded-lg p-3 border border-gray-200 dark:border-gray-800
                            bg-gray-50 dark:bg-gray-800 shadow-inner
                          "
                        >
                          <SelectedFilesListView
                            selectedFiles={selectedFiles}
                            filterExtensions={filterExtensions}
                            filesData={filesData}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* OPTIONS TAB */}
                  <TabsContent
                    value="options"
                    className="border rounded-xl p-5 bg-white dark:bg-gray-900 shadow-md mt-4 border-gray-200 dark:border-gray-800"
                  >
                    <div className="space-y-5">
                      <ExclusionsManagerView
                        excludedPaths={excludedPaths}
                        onUpdateExclusions={updateExclusions}
                      />

                      {projectPath ? (
                        <LocalExclusionsManagerView
                          projectPath={projectPath}
                          onChange={handleLocalExclusionsChange}
                        />
                      ) : (
                        <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900/50 rounded-lg text-amber-700 dark:text-amber-400">
                          <p className="text-sm flex items-center gap-2">
                            <HelpCircle size={16} />
                            Select a project folder first to manage local exclusions
                          </p>
                        </div>
                      )}

                      <div className="p-5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-base font-medium flex items-center gap-2">
                            <LayoutGrid size={16} className="text-indigo-500 dark:text-indigo-400" />
                            Filter by Extensions:
                          </Label>
                          {filterExtensions.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 dark:text-rose-400 transition-colors"
                              onClick={handleClearExtensions}
                            >
                              Clear All
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2 mb-3">
                          <Input
                            value={extensionInput}
                            onChange={(e) => setExtensionInput(e.target.value)}
                            placeholder="e.g. .js, .tsx"
                            className="focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-900"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddExtension()
                              }
                            }}
                          />
                          <Button
                            className="bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                            onClick={handleAddExtension}
                          >
                            Add
                          </Button>
                        </div>

                        {filterExtensions.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {filterExtensions.map((ext) => (
                              <Badge
                                key={ext}
                                variant="secondary"
                                className="
                                  bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800
                                  dark:text-indigo-300 px-3 py-1 flex items-center gap-1
                                  transition-colors
                                "
                              >
                                {ext}
                                <button
                                  onClick={() => handleRemoveExtension(ext)}
                                  className="
                                    ml-2 text-indigo-500 hover:text-indigo-700
                                    dark:text-indigo-400 dark:hover:text-indigo-200
                                    transition-colors
                                  "
                                  title="Remove"
                                >
                                  <X size={14} />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 text-sm italic mt-2">
                            No extension filters set. All file types will be shown.
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* TASKS TAB */}
                  <TabsContent
                    value="tasks"
                    className="border rounded-xl p-5 bg-white dark:bg-gray-900 shadow-md mt-4 border-gray-200 dark:border-gray-800"
                  >
                    <div className="space-y-4">
                      {projectPath ? (
                        <TodoListView projectPath={projectPath} />
                      ) : (
                        <div
                          className="
                            p-6 border border-amber-200 bg-amber-50 dark:bg-amber-950/40
                            dark:border-amber-900/50 rounded-lg text-amber-700
                            dark:text-amber-400 text-center
                          "
                        >
                          <div className="flex flex-col items-center gap-3">
                            <HelpCircle size={32} className="opacity-70" />
                            <div>
                              <h3 className="font-medium mb-1">Project Folder Required</h3>
                              <p className="text-sm">
                                Select a project folder first to manage project-specific tasks
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="
                                mt-2 border-amber-300 text-amber-700 hover:bg-amber-100
                                dark:border-amber-800 dark:text-amber-400
                                dark:hover:bg-amber-950
                              "
                              onClick={() => document.querySelector('input')?.focus()}
                            >
                              <Folder size={14} className="mr-1" />
                              Select Folder
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Panel */}
              <div className="space-y-6">
                <Card className="shadow-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                  <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <BookOpen size={18} className="text-purple-500 dark:text-purple-400" />
                      Prompt Instructions
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      Add context and instructions for the LLM
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>

                <Card className="shadow-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                  <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <Flame size={18} className="text-orange-500 dark:text-orange-400" />
                      Generate Prompt
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      Copy the final prompt to clipboard
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    {hasContent ? (
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
                    ) : (
                      <div className="text-center p-4 text-gray-500 dark:text-gray-400 flex flex-col items-center">
                        <Coffee size={32} className="mb-3 opacity-60" />
                        <p className="mb-2">No content to generate a prompt yet.</p>
                        <p className="text-sm">
                          Select files and/or add instructions to create your prompt.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stats card */}
                <Card className="shadow-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <CardHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-3">
                    <CardTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
                      <BarChart2 size={16} className="text-indigo-500 dark:text-indigo-400" />
                      Prompt Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Files Selected
                        </div>
                        <div className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                          {fileCount}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Total Tokens
                        </div>
                        <div className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                          {totalTokens.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Meta Prompt
                        </div>
                        <div className="text-2xl font-semibold text-teal-600 dark:text-teal-400">
                          {metaPrompt ? metaPrompt.length : 0} chars
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Instructions
                        </div>
                        <div className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                          {mainInstructions ? mainInstructions.length : 0} chars
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 pt-6 pb-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            <p>Code to Prompt Generator &copy; {new Date().getFullYear()} Aytzey</p>
            <p className="mt-1 text-xs">
              <a
                href="https://github.com/aytzey/CodetoPromptGenerator"
                className="text-indigo-500 dark:text-indigo-400 hover:underline"
              >
                View on GitHub
              </a>
              <span className="mx-2">•</span>
              <a href="#" className="text-indigo-500 dark:text-indigo-400 hover:underline">
                Report an Issue
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
