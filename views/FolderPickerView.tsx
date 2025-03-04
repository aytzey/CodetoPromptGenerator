// views/FolderPickerView.tsx

import React, { useState, useEffect } from 'react'
import FolderBrowserView from './FolderBrowserView'

interface FolderPickerProps {
  currentPath: string
  onPathSelected: (path: string) => void
  isLoading: boolean
}

const LOCAL_STORAGE_KEY = 'recentFolders'

const FolderPickerView: React.FC<FolderPickerProps> = ({
  currentPath,
  onPathSelected,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState(currentPath)
  const [showBrowser, setShowBrowser] = useState(false)
  const [recentFolders, setRecentFolders] = useState<string[]>([])

  useEffect(() => {
    setInputValue(currentPath)
  }, [currentPath])

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      setRecentFolders(JSON.parse(stored))
    }
  }, [])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    selectNewPath(inputValue.trim())
  }

  const selectNewPath = (path: string) => {
    if (path) {
      onPathSelected(path)
      updateRecentFolders(path)
    }
  }

  const updateRecentFolders = (path: string) => {
    setRecentFolders(prev => {
      const newList = [path, ...prev.filter(p => p !== path)]
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList.slice(0, 6))) // keep up to 6
      return newList.slice(0, 6)
    })
  }

  const openBrowser = () => setShowBrowser(true)
  const closeBrowser = () => setShowBrowser(false)

  const handleFolderSelected = (newPath: string) => {
    setInputValue(newPath)
    selectNewPath(newPath)
    setShowBrowser(false)
  }

  return (
    <div className="space-y-3">
      {/* Manual entry */}
      <form
        onSubmit={handleManualSubmit}
        className="flex flex-col md:flex-row items-stretch md:items-center gap-2"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Enter or paste a folder path"
            className="w-full bg-[#141527] text-gray-100 border border-[#3f4257] 
                       rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 
                       focus:ring-[#7b93fd] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-[#50fa7b] hover:bg-[#7b93fd] rounded text-[#141527] 
                     text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set
        </button>
        <button
          type="button"
          onClick={openBrowser}
          disabled={isLoading}
          className="px-4 py-2 bg-[#bd93f9] hover:bg-[#ff79c6] rounded text-[#141527] 
                     text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Browse...'}
        </button>
      </form>

      {/* Recent Folders */}
      {recentFolders.length > 0 && (
        <div className="bg-[#141527] p-3 rounded border border-[#2A2C42] space-y-2">
          <h4 className="text-sm text-gray-300 font-medium">Recent Folders:</h4>
          <ul className="space-y-1 text-xs">
            {recentFolders.map((pathStr, idx) => (
              <li key={`${pathStr}-${idx}`}>
                <button
                  type="button"
                  onClick={() => selectNewPath(pathStr)}
                  className="text-blue-400 hover:text-blue-300 underline"
                  title={pathStr}
                >
                  {pathStr}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Path Info */}
      {currentPath && (
        <div className="text-xs text-gray-400 truncate">
          <span className="font-semibold text-gray-300">Current Path: </span>
          {currentPath}
        </div>
      )}

      {/* FolderBrowser Modal */}
      {showBrowser && (
        <FolderBrowserView
          isOpen={showBrowser}
          onClose={closeBrowser}
          onSelect={handleFolderSelected}
          currentPath={currentPath}
        />
      )}
    </div>
  )
}

export default FolderPickerView
