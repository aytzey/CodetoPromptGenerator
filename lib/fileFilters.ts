// lib/fileFilters.ts
/**
 * A single file or directory node in the file tree.
 */

import picomatch from 'picomatch' 
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


// /**
//  * Split an input like `"*.js,  src/**/*.test.ts "` into clean patterns.
//  */
export function parseWildcardInput(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)             // comma / semicolon / whitespace
    .map(p => p.trim())
    .filter(Boolean)
}

/**
 * Recursively keep nodes whose *relativePath* or *name* matches **any**
 * glob in `patterns`.  Directories stay alive if **any** (hidden) child
 * matches, so the resulting tree remains navigable.
 */
export function applyWildcardFilter(
  nodes: FileNode[],
  patterns: string[]
): FileNode[] {
  if (!patterns.length) return nodes

  // Pre‑compile globs → matcher fns (picomatch is ~2 KiB, zero deps)
  const matchers = patterns.map(p =>
    picomatch(p, { nocase: true, dot: true }) // match “.” files too
  )

  const res: FileNode[] = []

  for (const n of nodes) {
    const isMatch =
      matchers.some(m => m(n.relativePath) || m(n.name))

    if (n.type === 'directory' && n.children?.length) {
      const kids = applyWildcardFilter(n.children, patterns)
      if (isMatch || kids.length) {
        res.push({ ...n, children: kids })
      }
    } else if (isMatch) {
      res.push({ ...n })
    }
  }
  return res
}

/**
 * Convenience – find a node by its *relativePath* inside a tree.
 */
export function findNodeByPath(
  nodes: FileNode[],
  relPath: string
): FileNode | undefined {
  for (const n of nodes) {
    if (n.relativePath === relPath) return n
    if (n.type === 'directory' && n.children) {
      const hit = findNodeByPath(n.children, relPath)
      if (hit) return hit
    }
  }
  return undefined
}

/**
 * List of text file extensions that should be included in "Select All"
 * This excludes binary files, images, videos, etc.
 */
const TEXT_FILE_EXTENSIONS = [
  // Programming languages
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cc', '.cxx', 
  '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
  '.r', '.m', '.mm', '.pl', '.pm', '.lua', '.dart', '.elm', '.clj', '.cljs',
  '.ex', '.exs', '.erl', '.hrl', '.fs', '.fsx', '.fsi', '.ml', '.mli', '.nim',
  '.v', '.vh', '.vhd', '.vhdl', '.jl', '.cr', '.zig', '.hx', '.hxml',
  
  // Web technologies
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl',
  '.vue', '.svelte', '.astro', '.njk', '.ejs', '.pug', '.hbs', '.mustache',
  
  // Data formats and configs
  '.json', '.jsonc', '.json5', '.xml', '.yaml', '.yml', '.toml', '.ini',
  '.conf', '.config', '.cfg', '.properties', '.env', '.env.local', '.env.production',
  '.env.development', '.env.test', '.gitignore', '.gitattributes', '.editorconfig',
  '.prettierrc', '.eslintrc', '.babelrc', '.npmrc', '.yarnrc',
  
  // Documentation
  '.md', '.mdx', '.rst', '.txt', '.text', '.asciidoc', '.adoc', '.tex',
  '.latex', '.org', '.pod', '.rdoc',
  
  // Shell scripts
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.psd1', '.bat', '.cmd',
  
  // Build files
  '.mk', '.make', '.makefile', '.cmake', '.gradle', '.maven',
  '.bazel', '.bzl', '.sbt', '.mill',
  
  // Other source files
  '.sql', '.graphql', '.gql', '.proto', '.thrift', '.avsc',
  '.dockerfile', '.containerfile', '.tf', '.tfvars', '.hcl',
  
  // Log files (optional - you might want to exclude these)
  '.log',
  
  // Common config files without extensions
  'dockerfile', 'makefile', 'rakefile', 'gemfile', 'guardfile', 
  'gulpfile', 'gruntfile', 'vagrantfile', 'jenkinsfile', 'procfile',
  
  // License and readme files
  'license', 'licence', 'readme', 'changelog', 'contributing',
  'authors', 'contributors', 'copying', 'install', 'news', 'thanks',
  'history', 'notice', 'manifest'
];

/**
 * Check if a file is a text file based on its extension or name
 */
export function isTextFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  
  // Check if it's a known config file without extension
  const nameWithoutPath = lowerName.split('/').pop() || '';
  if (TEXT_FILE_EXTENSIONS.some(name => 
    typeof name === 'string' && 
    !name.startsWith('.') && 
    nameWithoutPath === name
  )) {
    return true;
  }
  
  // Check extensions
  return TEXT_FILE_EXTENSIONS.some(ext => 
    ext.startsWith('.') && lowerName.endsWith(ext)
  );
}

/**
 * Filter an array of paths to only include text files
 */
export function filterTextFiles(paths: string[]): string[] {
  return paths.filter(path => {
    // Skip directories
    if (path.endsWith('/')) return false;
    
    // Check if it's a text file
    return isTextFile(path);
  });
}