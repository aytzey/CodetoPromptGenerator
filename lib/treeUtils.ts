// NEW FILE: lib/treeUtils.ts
import type { FileNode } from '@/types';

/**
 * Replicates the exclusion + extension filtering from existing logic
 * to generate a textual representation of the file tree.
 *
 * @param tree The file node tree.
 * @param globalExcludes List of global exclusion patterns/names.
 * @param filterExt List of file extensions to filter by (e.g., ['.ts', '.js']).
 * @param depth Current recursion depth for indentation.
 * @returns A string representing the indented file tree.
 */
export function generateTextualTree(
  tree: FileNode[],
  globalExcludes: string[],
  filterExt: string[],
  depth = 0,
): string {
  const indent   = '  '.repeat(depth);
  // Convert to Set for efficient lookup
  const excludes = new Set(globalExcludes);

  return tree
    // Filter based on global exclusions (simple name/segment matching)
    .filter(n => {
      const segs = n.relativePath.split('/');
      // Check if any segment or the full path is in the exclusion set
      return !segs.some(s => excludes.has(s)) && !excludes.has(n.relativePath);
    })
    // Filter based on extensions if filterExt is provided
    .filter(n => {
      if (filterExt.length === 0) return true; // No extension filter applied
      if (n.type === 'directory') return true; // Always include directories initially
      const lowerName = n.name.toLowerCase();
      // Ensure extensions in filterExt start with '.' for accurate matching
      return filterExt.some(e => lowerName.endsWith(e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`));
    })
    // Map nodes to string representation
    .map(n => {
      const icon = n.type === 'directory' ? '📁' : '📄';
      const line = `${indent}${icon} ${n.name}`;
      if (n.type === 'directory' && n.children) {
        // Recursively generate subtree, passing filters down
        const sub = generateTextualTree(n.children, globalExcludes, filterExt, depth + 1);
        // Only include the directory line if the subtree is not empty after filtering
        return sub.trim() ? `${line}\n${sub}` : '';
      }
      // It's a file (or an empty directory without children), return its line
      return line;
    })
    // Filter out empty strings (from directories that became empty after filtering)
    .filter(line => line.trim())
    .join('\n');
}