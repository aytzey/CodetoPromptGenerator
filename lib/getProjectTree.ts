// lib/getProjectTree.ts

import fs from 'fs'
import path from 'path'

/**
 * An interface representing a file or directory node in the project's tree.
 * The same definition is used in pages/api/files.ts for returned data.
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
 * ignoring any folders listed in 'ignoreDirs.txt' (read from the project root).
 *
 * @param rootDir The absolute or relative path the user wants to scan.
 * @param baseDir Only used internally for recursion to track relative paths.
 */
export function getProjectTree(rootDir: string, baseDir: string = rootDir): FileNode[] {
  // Convert rootDir to an absolute path to avoid "File not found" issues
  const resolvedRootDir = path.resolve(rootDir)
  console.log('getProjectTree called with resolvedRootDir:', resolvedRootDir)

  // IMPORTANT: Read ignoreDirs.txt from the project root, not from rootDir.
  const ignoreFilePath = path.join(process.cwd(), 'ignoreDirs.txt')
  let ignoredDirs: string[] = []
  if (fs.existsSync(ignoreFilePath)) {
    const content = fs.readFileSync(ignoreFilePath, 'utf-8')
    ignoredDirs = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => normalizeIgnorePath(line))
  }

  // Build and return the tree
  return buildTree(resolvedRootDir, resolvedRootDir, ignoredDirs)
}

/**
 * Build the file tree for the given currentDir. Return an array of FileNode objects.
 * This function recurses into subdirectories (except those excluded).
 */
function buildTree(currentDir: string, baseDir: string, ignoredDirs: string[]): FileNode[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })

  return entries
    .map(entry => {
      const fullPath = path.join(currentDir, entry.name)
      const relRaw = path.relative(baseDir, fullPath)
      const relativePath = unifySlashes(relRaw)

      // Skip if excluded
      if (isExcluded(relativePath, ignoredDirs)) {
        return null
      }

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          relativePath,
          absolutePath: unifySlashes(fullPath),
          type: 'directory',
          children: buildTree(fullPath, baseDir, ignoredDirs)
        }
      } else {
        return {
          name: entry.name,
          relativePath,
          absolutePath: unifySlashes(fullPath),
          type: 'file'
        }
      }
    })
    .filter(Boolean) as FileNode[]
}

/**
 * Returns true if `relativePath` includes any ignored directory name 
 * in its path segments. (E.g., ignoring "node_modules" excludes 
 * everything with that segment in the relative path.)
 */
function isExcluded(relativePath: string, ignoredDirs: string[]): boolean {
  const pathSegments = relativePath.split('/')
  for (const ignorePath of ignoredDirs) {
    if (pathSegments.includes(ignorePath)) {
      return true
    }
  }
  return false
}

/**
 * Normalize an ignore path by removing leading/trailing slashes and converting backslashes to slashes.
 */
function normalizeIgnorePath(ignoreStr: string): string {
  return ignoreStr
    .replace(/\\/g, '/')
    .replace(/^[/]+/, '')
    .replace(/[/]+$/, '')
}

/**
 * Replace all backslashes in a string with forward slashes.
 */
function unifySlashes(s: string): string {
  return s.replace(/\\/g, '/')
}
