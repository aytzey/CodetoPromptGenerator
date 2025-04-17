// lib/fileFilters.ts
/**
 * A single file or directory node in the file tree.
 */
export interface FileNode {
    name: string
    relativePath: string
    absolutePath: string
    type: 'file' | 'directory'
    children?: FileNode[]
  }
  
  /**
   * Recursively filter a list of FileNodes by extension.
   * Directories remain only if they have children (files) matching the extensions.
   *
   * @param nodes  The array of FileNodes to filter.
   * @param exts   The list of extensions to keep (e.g., ['.js', '.ts']).
   * @returns A new array of FileNodes that match or contain files matching the given extensions.
   */
  export function applyExtensionFilter(nodes: FileNode[], exts: string[]): FileNode[] {
    if (exts.length === 0) {
      // No extension filters specified; return nodes as-is.
      return nodes
    }
  
    const result: FileNode[] = []
    for (const node of nodes) {
      if (node.type === 'directory' && node.children) {
        // Filter children recursively
        const filteredChildren = applyExtensionFilter(node.children, exts)
        if (filteredChildren.length > 0) {
          // Keep this directory if any children remain after filtering
          result.push({ ...node, children: filteredChildren })
        }
      } else if (node.type === 'file') {
        // If it's a file, check extension
        if (matchesExtension(node.name, exts)) {
          result.push(node)
        }
      }
    }
    return result
  }
  
  /**
   * Determine if a file name ends with one of the given extensions.
   *
   * @param name   The file name.
   * @param exts   The list of extensions.
   */
  export function matchesExtension(name: string, exts: string[]): boolean {
    const lower = name.toLowerCase()
    return exts.some(ext => lower.endsWith(ext.toLowerCase()))
  }
  
  /**
   * Recursively filter a list of FileNodes by a text search term.
   *
   * @param nodes  The array of FileNodes to filter.
   * @param term   The search term in lowercase.
   * @returns A new array of FileNodes containing the search term,
   *          or directories whose children match the term.
   */
  export function applySearchFilter(nodes: FileNode[], term: string): FileNode[] {
    const results: FileNode[] = []
  
    for (const node of nodes) {
      const match = node.name.toLowerCase().includes(term)
  
      if (node.type === 'directory' && node.children) {
        // Filter children recursively
        const filteredChildren = applySearchFilter(node.children, term)
        if (match || filteredChildren.length > 0) {
          results.push({ ...node, children: filteredChildren })
        }
      } else if (match) {
        // It's a file, and it matches the search term
        results.push({ ...node })
      }
    }
  
    return results
  }
  
  /**
   * Flatten a tree of FileNodes into an array of their relative paths.
   *
   * @param nodes  The array of FileNodes.
   * @returns An array of relative paths (files + directories).
   */
  export function flattenTree(nodes: FileNode[]): string[] {
    let result: string[] = []
    for (const node of nodes) {
      result.push(node.relativePath)
      if (node.type === 'directory' && node.children) {
        result = result.concat(flattenTree(node.children))
      }
    }
    return result
  }
  
  /**
 * Flatten a tree into *file* relative paths only.
 *
 * @param nodes File‑tree nodes.
 * @returns    Array of relative paths for files (no directories).
 */
export function flattenFilePaths(nodes: FileNode[]): string[] {
  let out: string[] = [];
  for (const n of nodes) {
    if (n.type === 'file') {
      out.push(n.relativePath);
    } else if (n.children?.length) {
      out = out.concat(flattenFilePaths(n.children));
    }
  }
  return out;
}