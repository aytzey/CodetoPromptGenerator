// lib/getProjectTree.ts

import fs from 'fs'
import path from 'path'

/**
 * An interface representing a file or directory node in the project's tree.
 */
export interface FileNode {
  name: string
  relativePath: string
  absolutePath: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

/**
 * Recursively scan the given rootDir and construct a tree of files and directories,
 * ignoring any folders listed in 'ignoreDirs.txt' if present.
 * 
 * IMPORTANT CHANGE: We now call `path.resolve(...)` on rootDir to ensure
 * every file node's `absolutePath` is truly absolute, so the backend can read it.
 */
export function getProjectTree(rootDir: string, baseDir: string = rootDir): FileNode[] {
  // Convert rootDir to an absolute path to avoid "File not found on server" errors:
  const resolvedRootDir = path.resolve(rootDir)
  console.log('getProjectTree called with resolvedRootDir:', resolvedRootDir)

  // Read ignoreDirs.txt and parse its contents
  const ignoreFilePath = path.join(resolvedRootDir, 'ignoreDirs.txt')
  let ignoredDirs: string[] = []
  if (fs.existsSync(ignoreFilePath)) {
    const content = fs.readFileSync(ignoreFilePath, 'utf-8')
    ignoredDirs = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => normalizeIgnorePath(line))
  }

  // We also pass the resolvedRootDir as the baseDir
  return buildTree(resolvedRootDir, resolvedRootDir, ignoredDirs)
}

/**
 * Build the file tree for a single directory (currentDir).
 * Return an array of FileNode objects.
 */
function buildTree(currentDir: string, baseDir: string, ignoredDirs: string[]): FileNode[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })

  console.log(
    'Scanning directory:',
    currentDir,
    'found entries:',
    entries.map(e => e.name)
  )

  return entries
    .map(entry => {
      const fullPath = path.join(currentDir, entry.name)
      const relRaw = path.relative(baseDir, fullPath)
      const relativePath = unifySlashes(relRaw)

      // Skip if excluded by ignoreDirs
      if (isExcluded(relativePath, ignoredDirs)) {
        console.log('Excluding:', relativePath, 'based on ignoreDirs settings')
        return null
      }

      // Directory
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          relativePath,
          absolutePath: unifySlashes(fullPath),
          type: 'directory',
          children: buildTree(fullPath, baseDir, ignoredDirs),
        }
      }

      // File
      return {
        name: entry.name,
        relativePath,
        absolutePath: unifySlashes(fullPath),
        type: 'file',
      }
    })
    .filter(Boolean) as FileNode[]
}

/**
 * Return true if relativePath matches or starts with any path in ignoredDirs.
 */
function isExcluded(relativePath: string, ignoredDirs: string[]): boolean {
  for (const ignorePath of ignoredDirs) {
    if (relativePath === ignorePath || relativePath.startsWith(ignorePath + '/')) {
      return true
    }
  }
  return false
}

/**
 * Normalize an ignore path by replacing backslashes and trimming leading/trailing slashes.
 */
function normalizeIgnorePath(ignoreStr: string): string {
  let normalized = ignoreStr.replace(/\\/g, '/').replace(/^[/]+/, '').replace(/[/]+$/, '')
  return normalized
}

/**
 * Replace all backslashes with forward slashes.
 */
function unifySlashes(s: string): string {
  return s.replace(/\\/g, '/')
}
