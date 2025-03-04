// views/FolderPickerView.tsx
import React, { useState, useEffect } from 'react'
import FolderBrowserView from './FolderBrowserView'

interface FolderPickerProps {
  currentPath: string
  onPathSelected: (path: string) => void
  isLoading: boolean
}

const LOCAL_STORAGE_KEY = 'recentFolders'

/**
 * Allows users to type in a folder path or open a "folder browser" (mocked).
 * Also manages and shows recent folder selections.
 */
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
            className={`
              w-full rounded px-3 py-2 text-sm
              bg-gray-50 dark:bg-[#141527]
              border border-gray-300 dark:border-[#3f4257]
              text-gray-800 dark:text-gray-100
              focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#7b93fd]
            `}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`
            px-4 py-2 rounded text-sm font-medium
            bg-green-400 hover:bg-green-500 text-gray-800
            dark:bg-[#50fa7b] dark:hover:bg-[#7b93fd] dark:text-[#141527]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          Set
        </button>
        <button
          type="button"
          onClick={openBrowser}
          disabled={isLoading}
          className={`
            px-4 py-2 rounded text-sm font-medium
            bg-purple-400 hover:bg-purple-500 text-white
            dark:bg-[#bd93f9] dark:hover:bg-[#ff79c6] dark:text-[#141527]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isLoading ? 'Loading...' : 'Browse...'}
        </button>
      </form>

      {/* Recent Folders */}
      {recentFolders.length > 0 && (
        <div
          className={`
            p-3 rounded space-y-2
            bg-gray-50 dark:bg-[#141527]
            border border-gray-300 dark:border-[#2A2C42]
          `}
        >
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-300">Recent Folders:</h4>
          <ul className="space-y-1 text-xs">
            {recentFolders.map((pathStr, idx) => (
              <li key={`${pathStr}-${idx}`}>
                <button
                  type="button"
                  onClick={() => selectNewPath(pathStr)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
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
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Current Path: </span>
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
