import React, { useEffect, useState, useRef } from 'react'
import { ChevronLeft, Folder, HardDrive, X, ChevronRight, Search, Home, Clock } from 'lucide-react'

interface FolderItem {
  name: string
  path: string
}

interface FolderBrowserProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the user closes the modal (e.g., clicking the overlay or pressing Cancel) */
  onClose: () => void
  /** Called when the user selects a folder */
  onSelect: (path: string) => void
  /** The path initially displayed; if none, the user starts at e.g. drives. */
  currentPath: string
}

const BACKEND_URL = 'http://localhost:5000'

/**
 * A modal "folder browser" that tries to list drives and subfolders from a (mock) Python API.
 * This code is for demonstration and not a secure production solution.
 */
const FolderBrowserView: React.FC<FolderBrowserProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentPath
}) => {
  const [drives, setDrives] = useState<FolderItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [path, setPath] = useState<string>(currentPath || '')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [selectedDrive, setSelectedDrive] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [recentFolders, setRecentFolders] = useState<FolderItem[]>([])

  const modalRef = useRef<HTMLDivElement>(null)
  const folderGridRef = useRef<HTMLDivElement>(null)

  // On open, load drives + the current folder contents (if any)
  useEffect(() => {
    if (isOpen) {
      loadDrives()
      loadRecentFolders()
      if (currentPath) {
        browseFolder(currentPath)
      }
    }
  }, [isOpen, currentPath])

  // Close on ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  // Animate the modal in when open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.classList.add('opacity-100', 'scale-100')
      modalRef.current.classList.remove('opacity-0', 'scale-95')
    }
  }, [isOpen])

  /** Mock: load some recently used folders (placeholder) */
  const loadRecentFolders = () => {
    // In a real app, you might store/retrieve from localStorage or an API
    setRecentFolders([
      { name: 'Documents', path: 'C:\\Users\\User\\Documents' },
      { name: 'Downloads', path: 'C:\\Users\\User\\Downloads' },
      { name: 'Projects', path: 'C:\\Users\\User\\Projects' }
    ])
  }

  /** Fetch available drives from the Python backend. */
  const loadDrives = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const resp = await fetch(`${BACKEND_URL}/api/select_drives`)
      const data = await resp.json()
      if (data.success) {
        setDrives(data.drives || [])
      } else {
        setError(data.error || 'Failed to load drives')
      }
    } catch (err) {
      setError('Failed to connect to the server')
    } finally {
      setIsLoading(false)
    }
  }

  /** Browse a folder (subfolders) from the Python backend. */
  const browseFolder = async (folderPath: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const resp = await fetch(
        `${BACKEND_URL}/api/browse_folders?path=${encodeURIComponent(folderPath)}`
      )
      const data = await resp.json()

      if (data.success) {
        setPath(data.current_path)
        setParentPath(data.parent_path)
        setFolders(data.folders || [])
        setSearchQuery('') // Clear any search on navigation

        // Mark the drive as selected if path matches
        const matchedDrive = drives.find((drive) =>
          data.current_path.startsWith(drive.path)
        )
        setSelectedDrive(matchedDrive ? matchedDrive.path : null)

        // Reset scroll to top in the folder area
        if (folderGridRef.current) {
          folderGridRef.current.scrollTop = 0
        }
      } else {
        setError(data.error || 'Failed to browse folder')
      }
    } catch (err) {
      setError('Failed to browse folder')
    } finally {
      setIsLoading(false)
    }
  }

  /** Navigate up one directory level. */
  const goToParent = () => {
    if (parentPath) {
      browseFolder(parentPath)
    }
  }

  /** When a user clicks a drive in the sidebar. */
  const handleSelectDrive = (drivePath: string) => {
    setSelectedDrive(drivePath)
    browseFolder(drivePath)
  }

  /** Confirm selection. */
  const handleSelectFolder = () => {
    if (path) {
      const newRecentFolder = { name: path.split(/[/\\]/).pop() || path, path }
      if (!recentFolders.some((f) => f.path === path)) {
        setRecentFolders([newRecentFolder, ...recentFolders.slice(0, 4)])
      }
    }
    onSelect(path)
  }

  /** Filter subfolders by search query. */
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  /** Display a basic breadcrumb navigation. */
  const renderBreadcrumbs = () => {
    if (!path) return <span className="text-gray-400 italic">No folder selected</span>
    const parts = path.split(/[/\\]/).filter(Boolean)
    const isWindows = path.includes('\\')
    const separator = isWindows ? '\\' : '/'

    // Root part
    const rootPart = isWindows ? path.substring(0, 3) : '/'

    return (
      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1 scrollbar-thin">
        <button
          onClick={() => browseFolder(rootPart)}
          className="text-blue-400 hover:text-blue-300 font-medium px-1 flex items-center"
          title={rootPart}
        >
          <Home size={14} className="mr-1" />
          {rootPart}
        </button>

        {parts.slice(isWindows ? 1 : 0).map((part, idx) => {
          const currentPath = isWindows
            ? rootPart + parts.slice(1, idx + 1).join(separator)
            : separator + parts.slice(0, idx + 1).join(separator)

          return (
            <React.Fragment key={idx}>
              <ChevronRight size={14} className="text-gray-400" />
              <button
                onClick={() => browseFolder(currentPath)}
                className="text-blue-400 hover:text-blue-300 font-medium px-1 truncate max-w-xs"
                title={part}
              >
                {part}
              </button>
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  /** Animate close. */
  const handleClose = () => {
    if (modalRef.current) {
      modalRef.current.classList.add('opacity-0', 'scale-95')
      modalRef.current.classList.remove('opacity-100', 'scale-100')
      setTimeout(onClose, 200) // Wait for transition then fully close
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black bg-opacity-70" onClick={handleClose} />

      {/* Modal Container with transition */}
      <div
        ref={modalRef}
        className="relative w-11/12 max-w-5xl bg-gradient-to-b from-[#1e1f29] to-[#1a1b24]
                   rounded-lg shadow-2xl border border-[#3f4257] flex flex-col 
                   h-[80vh] overflow-hidden transition-all duration-300 ease-out
                   opacity-0 scale-95 transform"
      >
        {/* Secondary header: (search + breadcrumbs) hidden in this example, but you can re-enable if desired. */}
        {/* <div className="px-4 py-3 bg-[#282a36] border-b border-[#3f4257] flex flex-col gap-2 text-sm text-gray-200">
          // Search bar, Breadcrumb nav
        </div> */}

        {/* Error message */}
        {error && (
          <div className="m-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 text-red-300 rounded-md text-sm animate-pulse">
            <div className="flex items-center">
              <span className="font-bold mr-2">Error:</span> {error}
            </div>
          </div>
        )}

        {/* Main content: left sidebar (drives/recent) and right subfolder list */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-1/4 border-r border-[#3f4257] flex flex-col overflow-hidden">
            {/* Drives */}
            <div className="p-3 bg-gradient-to-r from-[#282a36] to-[#2c2e3f] border-b border-[#3f4257] flex items-center">
              <HardDrive size={16} className="text-[#8be9fd] mr-2" />
              <h4 className="text-white text-sm font-semibold">Drives</h4>
            </div>
            <div className="overflow-y-auto p-2 text-sm custom-scrollbar max-h-40">
              {isLoading && drives.length === 0 ? (
                <LoadingDots />
              ) : (
                <ul className="space-y-1">
                  {drives.map((drive) => (
                    <li key={drive.path}>
                      <button
                        onClick={() => handleSelectDrive(drive.path)}
                        className={`flex items-center w-full text-left px-3 py-2 rounded
                                    hover:bg-[#3f4257] transition-colors duration-200
                                    focus:outline-none focus:ring-1 focus:ring-[#50fa7b]
                                    ${
                                      selectedDrive === drive.path
                                        ? 'bg-[#44475a] text-[#8be9fd]'
                                        : 'text-white'
                                    }`}
                      >
                        <HardDrive
                          size={16}
                          className={`mr-2 ${
                            selectedDrive === drive.path ? 'text-[#8be9fd]' : 'text-gray-400'
                          }`}
                        />
                        <span className="truncate">{drive.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent Folders */}
            <div className="p-3 bg-gradient-to-r from-[#282a36] to-[#2c2e3f] border-y border-[#3f4257] flex items-center">
              <Clock size={16} className="text-[#ff79c6] mr-2" />
              <h4 className="text-white text-sm font-semibold">Recent Folders</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-2 text-sm custom-scrollbar">
              {recentFolders.length === 0 ? (
                <div className="text-center p-4 text-gray-400 italic">No recent folders</div>
              ) : (
                <ul className="space-y-1">
                  {recentFolders.map((folder) => (
                    <li key={folder.path}>
                      <button
                        onClick={() => browseFolder(folder.path)}
                        className="flex items-center w-full text-left px-3 py-2 rounded
                                   hover:bg-[#3f4257] transition-colors duration-200
                                   focus:outline-none focus:ring-1 focus:ring-[#50fa7b] text-white"
                        title={folder.path}
                      >
                        <Folder size={16} className="text-[#ff79c6] mr-2" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Main subfolder list */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Folders header */}
            <div className="p-3 bg-gradient-to-r from-[#282a36] to-[#2c2e3f] border-b border-[#3f4257]
                            flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center">
                <Folder size={16} className="text-[#f1fa8c] mr-2" />
                <h4 className="text-white text-sm font-semibold">Folders</h4>
              </div>
              {searchQuery && (
                <div className="text-xs text-gray-400">
                  {filteredFolders.length} of {folders.length} folders
                </div>
              )}
            </div>

            {/* Scrollable folder area */}
            <div ref={folderGridRef} className="flex-1 overflow-auto custom-scrollbar relative">
              {isLoading ? (
                <SkeletonLoadingTable />
              ) : filteredFolders.length === 0 ? (
                <NoFoldersEmptyState
                  searchQuery={searchQuery}
                  clearSearch={() => setSearchQuery('')}
                />
              ) : (
                <FolderTable
                  folders={filteredFolders}
                  onFolderClick={browseFolder}
                  parentBg="#282a36"
                  altBg="#20212b"
                />
              )}
            </div>
          </main>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-[#282a36] to-[#2c2e3f] p-4 border-t border-[#3f4257]
                        flex justify-between items-center">
          <div className="text-gray-400 text-sm">
            {filteredFolders.length > 0 && (
              <span>
                {filteredFolders.length} folder
                {filteredFolders.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-[#44475a] hover:bg-[#6272a4] text-white rounded-md
                         transition-colors duration-200 focus:outline-none focus:ring-2
                         focus:ring-[#bd93f9] shadow-md hover:shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSelectFolder}
              disabled={!path}
              className={`px-4 py-2 rounded-md font-bold transition-colors duration-200
                          focus:outline-none focus:ring-2 focus:ring-[#50fa7b]
                          shadow-md hover:shadow-lg transform hover:translate-y-[-1px]
                          ${
                            path
                              ? 'bg-[#50fa7b] hover:bg-[#69ff9c] text-[#282a36]'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
            >
              Select This Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Loading dots for the drives area. */
function LoadingDots() {
  return (
    <div className="flex items-center justify-center p-4 space-x-2">
      <div className="w-4 h-4 bg-[#50fa7b] rounded-full animate-pulse"></div>
      <div
        className="w-4 h-4 bg-[#8be9fd] rounded-full animate-pulse"
        style={{ animationDelay: '0.2s' }}
      ></div>
      <div
        className="w-4 h-4 bg-[#bd93f9] rounded-full animate-pulse"
        style={{ animationDelay: '0.4s' }}
      ></div>
    </div>
  )
}

/** Skeleton loading table for subfolder area. */
function SkeletonLoadingTable() {
  return (
    <div className="p-4">
      <table className="w-full border-collapse text-white table-fixed">
        <thead className="bg-[#2c2e3f] sticky top-0 z-10">
          <tr>
            <th className="text-left p-2 pl-4 border-b border-[#3f4257] font-semibold w-2/5">Name</th>
            <th className="text-left p-2 border-b border-[#3f4257] font-semibold w-3/5 hidden md:table-cell">
              Path
            </th>
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, i) => (
            <tr
              key={i}
              className={`${i % 2 === 0 ? 'bg-[#282a36]' : 'bg-[#20212b]'} animate-pulse`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <td className="p-2 pl-4 border-b border-[#3f4257]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#44475a] rounded-full"></div>
                  <div className="h-4 bg-[#44475a] rounded w-32"></div>
                </div>
              </td>
              <td className="p-2 border-b border-[#3f4257] hidden md:table-cell">
                <div className="h-4 bg-[#44475a] rounded w-full max-w-md"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Empty state if no folders match the search or none exist. */
function NoFoldersEmptyState({
  searchQuery,
  clearSearch
}: {
  searchQuery: string
  clearSearch: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
      {searchQuery ? (
        <>
          <Search size={48} className="mb-2 opacity-30" />
          <p>No folders matching &quot;{searchQuery}&quot;</p>
          <button
            onClick={clearSearch}
            className="mt-2 text-[#8be9fd] hover:underline focus:outline-none"
          >
            Clear search
          </button>
        </>
      ) : (
        <>
          <Folder size={48} className="mb-2 opacity-30" />
          <p>No folders found in this location</p>
        </>
      )}
    </div>
  )
}

/** Renders the subfolder table when data is loaded and not empty. */
function FolderTable({
  folders,
  onFolderClick,
  parentBg,
  altBg
}: {
  folders: FolderItem[]
  onFolderClick: (path: string) => void
  parentBg: string
  altBg: string
}) {
  return (
    <div className="overflow-auto custom-scrollbar">
      <table className="w-full border-collapse text-white table-fixed">
        <thead className="sticky top-0 z-10" style={{ backgroundColor: '#2c2e3f' }}>
          <tr>
            <th className="text-left p-2 pl-4 border-b border-[#3f4257] font-semibold w-2/5">
              Name
            </th>
            <th className="text-left p-2 border-b border-[#3f4257] font-semibold w-3/5 hidden md:table-cell">
              Path
            </th>
          </tr>
        </thead>
        <tbody>
          {folders.map((folder, index) => (
            <tr
              key={folder.path}
              className={`${index % 2 === 0 ? parentBg : altBg} 
                          hover:bg-[#3f4257] cursor-pointer transition-colors duration-100`}
              onClick={() => onFolderClick(folder.path)}
            >
              <td className="p-2 pl-4 border-b border-[#3f4257] text-[#f1fa8c]">
                <div className="flex items-center gap-2">
                  <Folder size={18} className="text-[#f1fa8c] flex-shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </div>
              </td>
              <td className="p-2 border-b border-[#3f4257] text-gray-400 truncate hidden md:table-cell">
                {folder.path}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default FolderBrowserView
