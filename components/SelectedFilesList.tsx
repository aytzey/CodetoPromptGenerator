// components/SelectedFilesList.tsx

import React from 'react';

interface FileData {
  path: string;
  tokenCount: number;
}

interface SelectedFilesListProps {
  filesData: FileData[];
}

const SelectedFilesList: React.FC<SelectedFilesListProps> = ({ filesData }) => {
  const totalTokens = filesData.reduce((acc, f) => acc + f.tokenCount, 0);

  return (
    <div className="border-t border-gray-700 mt-4 pt-4">
      <h3 className="text-lg font-semibold mb-2">Selected Files</h3>
      {filesData.length === 0 ? (
        <p className="text-gray-400 text-sm">No files selected.</p>
      ) : (
        <ul className="text-sm mb-2">
          {filesData.map(f => (
            <li key={f.path} className="mb-1">
              <span className="font-medium text-gray-100">{f.path}</span> - 
              <span className="text-gray-300 ml-1">Tokens: {f.tokenCount}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="font-medium">Total Tokens: <span className="text-blue-400">{totalTokens}</span></p>
    </div>
  );
};

export default SelectedFilesList;
