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
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#50fa7b] border-b border-panel pb-1">
        Prompts
      </h3>

      <div className="bg-[#1e1f29] p-3 rounded border border-[#3f4257] space-y-2">
        <label className="block text-sm text-gray-300 font-medium">
          Select Meta Prompt File:
        </label>
        <div className="flex items-center gap-2">
          <select
            value={selectedMetaFile}
            onChange={e => setSelectedMetaFile(e.target.value)}
            className="bg-[#1e1f29] text-gray-100 border border-[#3f4257] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#7b93fd]"
          >
            <option value="">--None--</option>
            {metaPromptFiles.map(file => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
          <button
            onClick={onLoadMetaPrompt}
            className="px-3 py-1 bg-[#7b93fd] hover:bg-[#50fa7b] rounded text-sm font-medium text-[#1e1f29]"
          >
            Load
          </button>
          <button
            onClick={onRefreshMetaList}
            className="px-3 py-1 bg-[#bd93f9] hover:bg-[#ff79c6] rounded text-sm font-medium text-[#1e1f29]"
          >
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMetaFileName}
            onChange={e => setNewMetaFileName(e.target.value)}
            placeholder="NewFileName.txt (optional)"
            className="bg-[#1e1f29] text-gray-100 border border-[#3f4257] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#7b93fd]"
          />
          <button
            onClick={onSaveMetaPrompt}
            className="px-3 py-1 bg-[#50fa7b] hover:bg-[#7b93fd] text-sm rounded font-medium text-[#1e1f29]"
          >
            Save Prompt
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          Meta Prompt:
        </label>
        <textarea
          value={metaPrompt}
          onChange={e => setMetaPrompt(e.target.value)}
          className="w-full h-20 p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-gray-100 text-sm focus:outline-none focus:border-[#7b93fd]"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-300">
          Main Instructions:
        </label>
        <textarea
          value={mainInstructions}
          onChange={e => setMainInstructions(e.target.value)}
          className="w-full h-32 p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-gray-100 text-sm focus:outline-none focus:border-[#7b93fd]"
        />
      </div>
    </div>
  )
}

export default InstructionsInputView
