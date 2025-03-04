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

/**
 * Displays a list of selected files (and directories if any).
 * Also shows total token count of loaded files.
 */
const SelectedFilesListView: React.FC<SelectedFilesListProps> = ({
  selectedFiles,
  filterExtensions,
  filesData
}) => {
  // Filter out any selected files that don't match the extension filter
  const filteredSelected = filterExtensions.length
    ? selectedFiles.filter(f => matchesAnyExtension(f, filterExtensions))
    : selectedFiles

  const filePaths = new Set(filesData.map(fd => fd.path))
  const directories = filteredSelected.filter(f => !filePaths.has(f))
  const displayedData = filesData.filter(fd => filteredSelected.includes(fd.path))

  const totalTokens = displayedData.reduce((acc, f) => acc + f.tokenCount, 0)

  return (
    <div className="text-sm text-gray-800 dark:text-gray-100">
      {filteredSelected.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No files or directories selected, or none match the filter.
        </p>
      ) : (
        <>
          <ul className="mb-2 space-y-1">
            {directories.map(d => (
              <li key={d} className="flex items-center gap-1">
                <span className="text-yellow-500 dark:text-yellow-400 font-semibold">📁</span>
                <span>{d}</span>
                <span className="text-gray-400 dark:text-gray-300 ml-1 text-xs">[dir]</span>
              </li>
            ))}

            {displayedData.map(file => (
              <li key={file.path} className="flex items-center gap-1">
                <span className="text-green-500 dark:text-green-400">📄</span>
                <span>{file.path}</span>
                <span className="text-gray-400 dark:text-gray-300 ml-1 text-xs">
                  [tokens: {file.tokenCount}]
                </span>
              </li>
            ))}
          </ul>
          {displayedData.length > 0 && (
            <p className="font-medium text-gray-800 dark:text-gray-100">
              Total Tokens:{' '}
              <span className="text-blue-600 dark:text-[#7b93fd]">{totalTokens}</span>
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
