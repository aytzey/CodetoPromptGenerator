// views/SelectedFilesListView.tsx

import React from 'react'

interface FileData {
  path: string
  content: string
  tokenCount: number
}

interface SelectedFilesListProps {
  selectedFiles: string[]
  filterExtensions: string[]
  filesData: FileData[]
}

const SelectedFilesListView: React.FC<SelectedFilesListProps> = ({
  selectedFiles,
  filterExtensions,
  filesData
}) => {
  const filteredSelected = filterExtensions.length
    ? selectedFiles.filter(f => matchesAnyExtension(f, filterExtensions))
    : selectedFiles

  const filePaths = new Set(filesData.map(fd => fd.path))
  const directories = filteredSelected.filter(f => !filePaths.has(f))
  const displayedData = filesData.filter(fd => filteredSelected.includes(fd.path))

  const totalTokens = displayedData.reduce((acc, f) => acc + f.tokenCount, 0)

  return (
    <div className="text-sm text-gray-100">
      {filteredSelected.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No files or directories selected, or none match the filter.
        </p>
      ) : (
        <>
          <ul className="mb-2 space-y-1">
            {directories.map(d => (
              <li key={d} className="flex items-center gap-1">
                <span className="text-yellow-400 font-semibold">📁</span>
                <span className="font-medium text-gray-100">{d}</span>
                <span className="text-gray-300 ml-1 text-xs">[dir]</span>
              </li>
            ))}

            {displayedData.map(file => (
              <li key={file.path} className="flex items-center gap-1">
                <span className="text-green-400">📄</span>
                <span className="font-medium">{file.path}</span>
                <span className="text-gray-300 ml-1 text-xs">
                  [tokens: {file.tokenCount}]
                </span>
              </li>
            ))}
          </ul>
          {displayedData.length > 0 && (
            <p className="font-medium">
              Total Tokens: <span className="text-[#7b93fd]">{totalTokens}</span>
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default SelectedFilesListView

function matchesAnyExtension(fileNameOrPath: string, extensions: string[]): boolean {
  const lower = fileNameOrPath.toLowerCase()
  return extensions.some(ext => lower.endsWith(ext.toLowerCase()))
}
