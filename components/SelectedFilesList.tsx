// components/SelectedFilesList.tsx

import React from 'react';

interface FileData {
  path: string;
  content: string;
  tokenCount: number;
}

interface SelectedFilesListProps {
  selectedFiles: string[];
  filterExtensions: string[];
  filesData: FileData[];
}

const SelectedFilesList: React.FC<SelectedFilesListProps> = ({ selectedFiles, filterExtensions, filesData }) => {
  const filteredSelectedFiles = filterExtensions.length > 0
    ? selectedFiles.filter(f => matchesAnyExtension(f, filterExtensions))
    : selectedFiles;

  // FilesData only has files. Directories are selected but won't appear in filesData.
  // Let's separate directories and files:
  const filesSet = new Set(filesData.map(fd => fd.path));
  const directories = filteredSelectedFiles.filter(f => !filesSet.has(f));
  const displayedData = filesData.filter(fd => filteredSelectedFiles.includes(fd.path));
  
  const totalTokens = displayedData.reduce((acc, f) => acc + f.tokenCount, 0);

  return (
    <div className="border-t border-gray-700 mt-4 pt-4">
      <h3 className="text-lg font-semibold mb-2">Selected Files</h3>
      {filteredSelectedFiles.length === 0 ? (
        <p className="text-gray-400 text-sm">No files or directories selected, or none match the current filter.</p>
      ) : (
        <>
          <ul className="text-sm mb-2 space-y-1">
            {directories.map(d => (
              <li key={d}>
                <span className="font-medium text-gray-100">
                  📁 {d}
                </span>
                <span className="text-gray-300 ml-1">Tokens: N/A</span>
              </li>
            ))}
            {displayedData.map(f => (
              <li key={f.path}>
                <span className="font-medium text-gray-100">
                  📄 {f.path}
                </span>
                <span className="text-gray-300 ml-1">Tokens: {f.tokenCount}</span>
              </li>
            ))}
          </ul>
          {displayedData.length > 0 && (
            <p className="font-medium">Total Tokens: <span className="text-blue-400">{totalTokens}</span></p>
          )}
        </>
      )}
    </div>
  );
};

export default SelectedFilesList;

function matchesAnyExtension(fileNameOrPath: string, extensions: string[]): boolean {
  if (extensions.length === 0) return true;
  const lowerName = fileNameOrPath.toLowerCase();
  return extensions.some(ext => lowerName.endsWith(ext.toLowerCase()));
}
