// views/LocalExclusionsManagerView.tsx
import React, { useState, useEffect } from 'react'

interface LocalExclusionsManagerViewProps {
  excludedPaths: string[]
  onUpdateExclusions: (paths: string[]) => void
}

/**
 * Manages a separate set of excluded paths that:
 *  - Do NOT hide the files/folders in the UI
 *  - Are NOT selected when the user clicks "Select All"
 *  - Can still be individually selected if the user chooses
 *
 * This is different from `ignoreDirs.txt`, which *completely* hides items.
 */
const LocalExclusionsManagerView: React.FC<LocalExclusionsManagerViewProps> = ({
  excludedPaths,
  onUpdateExclusions
}) => {
  const [localList, setLocalList] = useState<string[]>([])
  const [newEntry, setNewEntry] = useState('')

  useEffect(() => {
    setLocalList(excludedPaths)
  }, [excludedPaths])

  function handleAdd() {
    const trimmed = newEntry.trim()
    if (!trimmed) return

    // Avoid duplicates
    if (!localList.includes(trimmed)) {
      const updated = [...localList, trimmed]
      setLocalList(updated)
      onUpdateExclusions(updated)
    }
    setNewEntry('')
  }

  function handleRemove(item: string) {
    const updated = localList.filter(i => i !== item)
    setLocalList(updated)
    onUpdateExclusions(updated)
  }

  return (
    <div
      className={`
        p-3 rounded border space-y-2
        bg-gray-50 dark:bg-[#141527]
        border-gray-300 dark:border-[#2A2C42]
      `}
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Project-Specific Exclusions (Show but Not in "Select All"):
        </label>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newEntry}
          onChange={e => setNewEntry(e.target.value)}
          placeholder="Example: src/temp"
          className={`
            flex-1 px-2 py-1 rounded text-sm focus:outline-none
            bg-gray-100 dark:bg-[#12131C]
            border border-gray-300 dark:border-[#3f4257]
            text-gray-800 dark:text-gray-100
          `}
        />
        <button
          onClick={handleAdd}
          className={`
            px-3 py-1 rounded text-sm font-medium
            bg-green-400 hover:bg-blue-400 text-gray-800
            dark:bg-[#50fa7b] dark:hover:bg-[#7b93fd] dark:text-[#141527]
          `}
        >
          Add
        </button>
      </div>

      <div className="max-h-32 overflow-y-auto pr-1 scrollbar-thin">
        {localList.length === 0 ? (
          <p className="text-gray-400 text-xs italic">
            No project-specific exclusions defined.
          </p>
        ) : (
          <ul className="space-y-1">
            {localList.map(item => (
              <li
                key={item}
                className="flex justify-between items-center bg-[#12131C] rounded p-1 px-2 text-sm"
              >
                <span className="text-gray-200">{item}</span>
                <button
                  onClick={() => handleRemove(item)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default LocalExclusionsManagerView
