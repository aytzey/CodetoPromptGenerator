// views/InstructionsInputView.tsx

import React from 'react'

interface InstructionsInputProps {
  metaPrompt: string
  setMetaPrompt: (v: string) => void
  mainInstructions: string
  setMainInstructions: (v: string) => void
  metaPromptFiles: string[]
  selectedMetaFile: string
  setSelectedMetaFile: (v: string) => void
  onLoadMetaPrompt: () => void
  onSaveMetaPrompt: () => void
  newMetaFileName: string
  setNewMetaFileName: (v: string) => void
  onRefreshMetaList: () => void
}

const MAX_CHARS = 1000

const InstructionsInputView: React.FC<InstructionsInputProps> = ({
  metaPrompt,
  setMetaPrompt,
  mainInstructions,
  setMainInstructions,
  metaPromptFiles,
  selectedMetaFile,
  setSelectedMetaFile,
  onLoadMetaPrompt,
  onSaveMetaPrompt,
  newMetaFileName,
  setNewMetaFileName,
  onRefreshMetaList
}) => {
  const metaCount = metaPrompt.length
  const mainCount = mainInstructions.length

  const metaColor = metaCount > MAX_CHARS ? 'text-red-400' : 'text-gray-400'
  const mainColor = mainCount > MAX_CHARS ? 'text-red-400' : 'text-gray-400'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold bg-gradient-to-r from-[#ff79c6] to-[#bd93f9] text-transparent bg-clip-text mb-4">
        Prompts
      </h3>

      {/* Meta Prompt Selector */}
      <div className="space-y-3">
        <label className="block text-sm text-gray-300 font-medium">Select Meta Prompt File</label>
        <div className="flex gap-2">
          <select
            value={selectedMetaFile}
            onChange={e => setSelectedMetaFile(e.target.value)}
            className="flex-grow bg-[#141527] border border-[#3f4257] rounded-lg px-3 py-2 text-gray-100 
                       focus:outline-none focus:ring-2 focus:ring-[#bd93f9] transition-all 
                       appearance-none custom-select"
          >
            <option value="">--None--</option>
            {metaPromptFiles.map(file => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
          <button
            className="px-3 py-2 bg-[#7b93fd] hover:bg-[#50fa7b] rounded-lg text-sm font-medium text-[#141527]"
            onClick={onLoadMetaPrompt}
          >
            Load
          </button>
          <button
            className="px-3 py-2 bg-[#bd93f9] hover:bg-[#ff79c6] rounded-lg text-sm font-medium text-[#141527]"
            onClick={onRefreshMetaList}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Save meta prompt */}
      <div className="space-y-3">
        <label className="block text-sm text-gray-300 font-medium">
          New File Name (optional):
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMetaFileName}
            onChange={e => setNewMetaFileName(e.target.value)}
            placeholder="NewFileName.txt"
            className="flex-grow bg-[#141527] border border-[#3f4257] rounded-lg px-3 py-2 text-gray-100 
                       focus:outline-none focus:ring-2 focus:ring-[#7b93fd]"
          />
          <button
            onClick={onSaveMetaPrompt}
            className="px-3 py-2 bg-[#50fa7b] hover:bg-[#7b93fd] text-sm rounded font-medium text-[#141527]"
          >
            Save Prompt
          </button>
        </div>
      </div>

      {/* Meta Prompt Input */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Meta Prompt:</label>
        <textarea
          value={metaPrompt}
          onChange={e => setMetaPrompt(e.target.value)}
          className="w-full h-20 p-2 bg-[#141527] border border-[#3f4257] rounded text-gray-100 text-sm 
                     focus:outline-none focus:border-[#7b93fd]"
        />
        <div className={`text-right text-xs ${metaColor}`}>
          {metaCount} / {MAX_CHARS} chars
        </div>
      </div>

      {/* Main Instructions */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">Main Instructions:</label>
        <textarea
          value={mainInstructions}
          onChange={e => setMainInstructions(e.target.value)}
          className="w-full h-32 p-2 bg-[#141527] border border-[#3f4257] rounded text-gray-100 text-sm 
                     focus:outline-none focus:border-[#7b93fd]"
        />
        <div className={`text-right text-xs ${mainColor}`}>
          {mainCount} / {MAX_CHARS} chars
        </div>
      </div>
    </div>
  )
}

export default InstructionsInputView
