import fs from 'fs';
import path from 'path';

export interface FileNode {
  name: string;
  relativePath: string; // store relative path only
  type: 'file' | 'directory';
  children?: FileNode[];
}

/**
 * Recursively reads a directory and returns a structured tree of files/folders.
 * All paths are stored as relative paths to the rootDir.
 * Directories listed in ignoreDirs.txt are excluded, as well as their descendants.
 */

export function getProjectTree(rootDir: string, baseDir: string = rootDir): FileNode[] {
  // Read ignoreDirs.txt and parse its contents
  const ignoreFilePath = path.join(rootDir, 'ignoreDirs.txt');
  let ignoredDirs: string[] = [];
  if (fs.existsSync(ignoreFilePath)) {
    const content = fs.readFileSync(ignoreFilePath, 'utf-8');
    // Each line represents a directory pattern to ignore
    ignoredDirs = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
  }

  return buildTree(rootDir, baseDir, ignoredDirs);
}

function buildTree(currentDir: string, baseDir: string, ignoredDirs: string[]): FileNode[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  return entries
    .map(entry => {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Check if this entry should be excluded based on ignoredDirs
      if (isExcluded(relativePath, ignoredDirs)) {
        return null; // skip this entry
      }

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          relativePath,
          type: 'directory',
          children: buildTree(fullPath, baseDir, ignoredDirs),
        };
      }

      return {
        name: entry.name,
        relativePath,
        type: 'file',
      };
    })
    .filter(Boolean) as FileNode[];
}

function isExcluded(relativePath: string, ignoredDirs: string[]): boolean {
  // If relativePath matches or starts with any ignored path, exclude it
  for (const ignorePath of ignoredDirs) {
    if (ignorePath) {
      // Normalize ignorePath to not have trailing slash
      const normalizedIgnore = ignorePath.replace(/\/$/, '');
      if (
        relativePath === normalizedIgnore ||
        relativePath.startsWith(normalizedIgnore + '/')
      ) {
        return true;
      }
    }
  }

  return false;
}
