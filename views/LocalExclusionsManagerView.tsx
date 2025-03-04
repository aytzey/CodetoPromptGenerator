// views/LocalExclusionsManagerView.tsx

import React, { useState, useEffect } from 'react'

interface LocalExclusionsManagerViewProps {
  /** The absolute path of the "opened" project, used to store localExclusions. */
  projectPath: string

  /**
   * Notifies parent that the localExclusions list has changed.
   * This is critical so the parent can respect these exclusions in "Select All".
   */
  onChange?: (newList: string[]) => void
}

/**
 * Manages a separate set of excluded paths that:
 *  - Are not hidden in the UI
 *  - Are not selected when user clicks "Select All"
 *  - But can still be individually selected if the user wants
 *
 * We store these "localExclusions" in <projectPath>/.codetoprompt/localExclusions.json
 * via the Python backend.
 */
const LocalExclusionsManagerView: React.FC<LocalExclusionsManagerViewProps> = ({
  projectPath,
  onChange
}) => {
  const [localList, setLocalList] = useState<string[]>([])
  const [newEntry, setNewEntry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectPath) {
      fetchLocalExclusions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath])

  /** Loads the localExclusions from <projectPath>/.codetoprompt/localExclusions.json */
  async function fetchLocalExclusions() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(
        `http://localhost:5000/api/localExclusions?projectPath=${encodeURIComponent(projectPath)}`
      )
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }
      const data = await resp.json()
      if (data.success) {
        const list = data.localExclusions || []
        setLocalList(list)
        if (onChange) {
          onChange(list)
        }
      } else {
        setError(data.error || 'Unknown error while fetching local exclusions')
      }
    } catch (err: any) {
      setError(`Failed to load local exclusions: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  /** POST to save localExclusions.json in the backend */
  async function saveLocalExclusions(updated: string[]) {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(
        `http://localhost:5000/api/localExclusions?projectPath=${encodeURIComponent(projectPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localExclusions: updated })
        }
      )
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to save local exclusions')
      }
      setLocalList(data.localExclusions || [])
      if (onChange) {
        onChange(data.localExclusions || [])
      }
    } catch (err: any) {
      setError(`Failed to save local exclusions: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    const trimmed = newEntry.trim()
    if (!trimmed) return
    if (!localList.includes(trimmed)) {
      const updated = [...localList, trimmed]
      setNewEntry('')
      saveLocalExclusions(updated)
    } else {
      setNewEntry('')
    }
  }

  function handleRemove(item: string) {
    const updated = localList.filter(i => i !== item)
    saveLocalExclusions(updated)
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
          Project-Specific Exclusions (Show but not in "Select All"):
        </label>
      </div>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-xs p-2">
          Error: {error}
        </div>
      )}
      {loading && <div className="text-xs italic text-gray-500">Loading...</div>}

      <div className="flex gap-2">
        <input
          type="text"
          value={newEntry}
          onChange={e => setNewEntry(e.target.value)}
          placeholder="Example: package-lock.json"
          className={`
            flex-1 px-2 py-1 rounded text-sm focus:outline-none
            bg-gray-100 dark:bg-[#12131C]
            border border-gray-300 dark:border-[#3f4257]
            text-gray-800 dark:text-gray-100
          `}
        />
        <button
          onClick={handleAdd}
          disabled={loading}
          className={`
            px-3 py-1 rounded text-sm font-medium
            bg-green-400 hover:bg-blue-400 text-gray-800
            dark:bg-[#50fa7b] dark:hover:bg-[#7b93fd] dark:text-[#141527]
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          Add
        </button>
      </div>

      <div className="max-h-32 overflow-y-auto pr-1 scrollbar-thin">
        {(!localList || localList.length === 0) ? (
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
