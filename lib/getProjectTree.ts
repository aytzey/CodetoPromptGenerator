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
      // Convert any backslashes to forward slashes in the relative path.
      const relativePathRaw = path.relative(baseDir, fullPath);
      const relativePath = unifySlashes(relativePathRaw);

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
  // The incoming relativePath is already slash-unified by unifySlashes.
  for (const ignorePath of ignoredDirs) {
    // If relativePath matches the ignorePath exactly or starts with it followed by '/'.
    if (relativePath === ignorePath || relativePath.startsWith(ignorePath + '/')) {
      return true;
    }
  }
  return false;
}

function normalizeIgnorePath(ignoreStr: string): string {
  // First, replace all backslashes with forward slashes, then remove leading/trailing slashes.
  let normalized = ignoreStr.replace(/\\/g, '/').replace(/^[/]+/, '').replace(/[/]+$/, '');
  return normalized;
}

function unifySlashes(s: string): string {
  // Convert all backslashes to forward slashes.
  return s.replace(/\\/g, '/');
}
