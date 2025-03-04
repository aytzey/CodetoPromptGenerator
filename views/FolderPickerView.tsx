// views/FolderPickerView.tsx

import React, { useState } from 'react'
import FolderBrowserView from './FolderBrowserView'

interface FolderPickerProps {
  currentPath: string
  onPathSelected: (path: string) => void
  isLoading: boolean
}

const FolderPickerView: React.FC<FolderPickerProps> = ({
  currentPath,
  onPathSelected,
  isLoading
}) => {
  // Manually entered path
  const [inputValue, setInputValue] = useState(currentPath)

  // Browser modal
  const [showBrowser, setShowBrowser] = useState(false)

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onPathSelected(inputValue.trim())
  }

  const openBrowser = () => {
    setShowBrowser(true)
  }

  const closeBrowser = () => {
    setShowBrowser(false)
  }

  const handleFolderSelected = (newPath: string) => {
    onPathSelected(newPath)
    setInputValue(newPath)
    setShowBrowser(false)
  }

  return (
    <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] space-y-3">
      <label className="block text-sm text-gray-300 font-medium mb-1">
        Project Folder:
      </label>

      {/* Row with manual path input and "Set"/"Browse" buttons */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter or paste a folder path"
          className="flex-1 bg-[#12131C] text-gray-100 border border-[#3f4257] 
                     rounded px-2 py-1 text-sm focus:outline-none 
                     focus:border-[#7b93fd] transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1 rounded text-sm font-medium text-white 
                     bg-[#50fa7b] hover:bg-[#7b93fd] transition-colors 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Set
        </button>
        <button
          type="button"
          onClick={openBrowser}
          disabled={isLoading}
          className="px-3 py-1 rounded text-sm font-medium text-white 
                     bg-[#bd93f9] hover:bg-[#ff79c6] transition-colors 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Browse...'}
        </button>
      </form>

      {/* Show current path if set */}
      {currentPath && (
        <div className="mt-1 text-xs text-gray-400 truncate">
          <span className="font-semibold text-gray-300">Current Path: </span>
          {currentPath}
        </div>
      )}

      {/* Modal for folder browsing */}
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
