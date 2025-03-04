// views/ExclusionsManagerView.tsx

import React, { useState, useEffect } from 'react'

interface ExclusionsManagerProps {
  excludedPaths: string[]
  onUpdateExclusions: (paths: string[]) => Promise<void>
}

const ExclusionsManagerView: React.FC<ExclusionsManagerProps> = ({
  excludedPaths,
  onUpdateExclusions
}) => {
  const [localExclusions, setLocalExclusions] = useState<string[]>([])
  const [newExclusion, setNewExclusion] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize with props
  useEffect(() => {
    setLocalExclusions(excludedPaths)
  }, [excludedPaths])

  const handleAdd = () => {
    if (!newExclusion.trim()) return

    // Don't add duplicates
    if (localExclusions.includes(newExclusion.trim())) {
      setNewExclusion('')
      return
    }

    setLocalExclusions(prev => [...prev, newExclusion.trim()])
    setNewExclusion('')
  }

  const handleRemove = (exclusion: string) => {
    setLocalExclusions(prev => prev.filter(e => e !== exclusion))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdateExclusions(localExclusions)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving exclusions:', error)
      alert('Failed to save exclusions')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-300 font-medium">
          Excluded Paths:
        </label>
        
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className={`px-3 py-1 rounded text-sm font-medium text-[#1e1f29] transition-colors ${
            isEditing 
              ? 'bg-[#50fa7b] hover:bg-[#7b93fd]' 
              : 'bg-[#7b93fd] hover:bg-[#50fa7b]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              placeholder="e.g. node_modules, .git, etc."
              className="flex-1 bg-[#12131C] text-gray-100 border border-[#3f4257] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#7b93fd]"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-[#50fa7b] hover:bg-[#7b93fd] rounded text-sm font-medium text-[#1e1f29]"
            >
              Add
            </button>
          </div>

          <div className="max-h-32 overflow-y-auto pr-1 scrollbar-thin">
            {localExclusions.length === 0 ? (
              <p className="text-gray-400 text-xs italic">No exclusions defined. Common exclusions: node_modules, .git, .next, dist</p>
            ) : (
              <ul className="space-y-1">
                {localExclusions.map((exclusion) => (
                  <li key={exclusion} className="flex justify-between items-center bg-[#12131C] rounded p-1 px-2 text-sm">
                    <span className="text-gray-200">{exclusion}</span>
                    <button
                      onClick={() => handleRemove(exclusion)}
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
      ) : (
        <div className="max-h-24 overflow-y-auto pr-1 scrollbar-thin">
          {localExclusions.length === 0 ? (
            <p className="text-gray-400 text-xs italic">No exclusions defined</p>
          ) : (
            <ul className="space-y-1">
              {localExclusions.map((exclusion) => (
                <li key={exclusion} className="bg-[#12131C] rounded p-1 px-2 text-sm text-gray-200">
                  {exclusion}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default ExclusionsManagerView