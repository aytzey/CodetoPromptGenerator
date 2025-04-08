// File: types/index.ts
// NEW FILE

// Re-export or define common types used across the application

// From lib/fileFilters or define here if preferred
export interface FileNode {
    name: string;
    relativePath: string;
    absolutePath: string; // Added absolutePath based on backend service
    type: 'file' | 'directory';
    children?: FileNode[];
  }
  
  // From stores/useProjectStore
  export interface FileData {
    path: string;
    content: string;
    tokenCount: number;
  }
  
  // From stores/useTodoStore
  export interface TodoItem {
    id: number;
    text: string;
    completed: boolean;
    createdAt?: string;
  }
  
  // Add other shared types as needed
  