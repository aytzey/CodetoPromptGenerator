// lib/getProjectTree.ts
import fs from 'fs';
import path from 'path';

export interface FileNode {
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export function getProjectTree(rootDir: string, baseDir: string = rootDir): FileNode[] {
  console.log('getProjectTree called with rootDir:', rootDir);
  // Read ignoreDirs.txt and parse its contents
  const ignoreFilePath = path.join(rootDir, 'ignoreDirs.txt');
  let ignoredDirs: string[] = [];
  if (fs.existsSync(ignoreFilePath)) {
    const content = fs.readFileSync(ignoreFilePath, 'utf-8');
    ignoredDirs = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(line => normalizeIgnorePath(line));
  }

  return buildTree(rootDir, baseDir, ignoredDirs);
}

function buildTree(currentDir: string, baseDir: string, ignoredDirs: string[]): FileNode[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  // Debug line to see what we are scanning
  console.log('Scanning directory:', currentDir, 'found entries:', entries.map(e => e.name));

  return entries
    .map(entry => {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (isExcluded(relativePath, ignoredDirs)) {
        console.log('Excluding:', relativePath, 'based on ignoreDirs settings');
        return null;
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
  for (const ignorePath of ignoredDirs) {
    // If relativePath matches the ignorePath exactly or starts with it followed by a slash, exclude it.
    if (relativePath === ignorePath || relativePath.startsWith(ignorePath + path.sep)) {
      return true;
    }
  }
  return false;
}

function normalizeIgnorePath(ignoreStr: string): string {
  // Remove leading and trailing slashes
  let normalized = ignoreStr.replace(/^\/+/, '').replace(/\/+$/, '');
  return normalized;
}
