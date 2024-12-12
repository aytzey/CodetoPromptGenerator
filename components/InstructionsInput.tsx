import React from 'react';

interface InstructionsInputProps {
  metaPrompt: string;
  setMetaPrompt: (v: string) => void;
  mainInstructions: string;
  setMainInstructions: (v: string) => void;
  metaPromptFiles: string[]; // list of available meta prompt files
  selectedMetaFile: string;
  setSelectedMetaFile: (v: string) => void;
  onLoadMetaPrompt: () => void;
  onSaveMetaPrompt: () => void;
  newMetaFileName: string;
  setNewMetaFileName: (v: string) => void;
  onRefreshMetaList: () => void; // New prop
}

const InstructionsInput: React.FC<InstructionsInputProps> = ({
  metaPrompt, setMetaPrompt, mainInstructions, setMainInstructions,
  metaPromptFiles, selectedMetaFile, setSelectedMetaFile,
  onLoadMetaPrompt, onSaveMetaPrompt,
  newMetaFileName, setNewMetaFileName,
  onRefreshMetaList
}) => {
  return (
    <div className="mb-4 space-y-4">
      <h3 className="text-lg font-semibold mb-2 border-b border-[#3f4257] pb-2">Prompts</h3>

      {/* Meta Prompt Load/Save Section */}
      <div className="bg-[#2c2f3f] bg-opacity-90 p-3 rounded border border-[#3f4257]">
        <label className="block font-medium mb-1 text-[#e0e2f0]">
          Select Meta Prompt File:
        </label>
        <div className="flex items-center gap-2 mb-2">
          <select
            value={selectedMetaFile}
            onChange={e => setSelectedMetaFile(e.target.value)}
            className="bg-[#1e1f29] text-[#e0e2f0] border border-[#3f4257] rounded px-2 py-1 focus:outline-none focus:border-[#8be9fd]"
          >
            <option value="">--None--</option>
            {metaPromptFiles.map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
          <button
            onClick={onLoadMetaPrompt}
            className="px-3 py-1 bg-[#8be9fd] hover:bg-[#50fa7b] transition-colors rounded font-medium text-sm text-[#1e1f29]"
          >
            Load
          </button>
          <button
            onClick={onRefreshMetaList}
            className="px-3 py-1 bg-[#bd93f9] hover:bg-[#ff79c6] transition-colors rounded font-medium text-sm text-[#1e1f29]"
          >
            Refresh List
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input 
            type="text" 
            value={newMetaFileName}
            onChange={e => setNewMetaFileName(e.target.value)}
            placeholder="NewFileName.txt (optional)"
            className="bg-[#1e1f29] text-[#e0e2f0] border border-[#3f4257] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#8be9fd]"
          />
          <button
            onClick={onSaveMetaPrompt}
            className="px-3 py-1 bg-[#50fa7b] hover:bg-[#8be9fd] transition-colors rounded font-medium text-sm text-[#1e1f29]"
          >
            Save Current Prompt
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1 text-[#e0e2f0]">Meta Prompt:</label>
        <textarea 
          value={metaPrompt} 
          onChange={e => setMetaPrompt(e.target.value)} 
          className="w-full h-20 p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-[#e0e2f0] focus:outline-none focus:border-[#8be9fd]"
        />
      </div>

      <div>
        <label className="block font-medium mb-1 text-[#e0e2f0]">Main Instructions:</label>
        <textarea 
          value={mainInstructions} 
          onChange={e => setMainInstructions(e.target.value)} 
          className="w-full h-32 p-2 bg-[#1e1f29] border border-[#3f4257] rounded text-[#e0e2f0] focus:outline-none focus:border-[#8be9fd]"
        />
      </div>
    </div>
  );
};

export default InstructionsInput;
