// File: stores/useTodoStore.ts
// NEW FILE
import { create } from 'zustand';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt?: string; // Keep optional for compatibility
}

type TodoFilter = 'all' | 'active' | 'completed';

interface TodoState {
  todos: TodoItem[];
  setTodos: (todos: TodoItem[]) => void;
  addTodoOptimistic: (todo: TodoItem) => void; // For UI update before API response
  updateTodoOptimistic: (id: number, completed: boolean) => void;
  removeTodoOptimistic: (id: number) => void;
  filter: TodoFilter;
  setFilter: (filter: TodoFilter) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAdding: boolean;
  setIsAdding: (adding: boolean) => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  setTodos: (todos) => set({ todos }),
  addTodoOptimistic: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
  updateTodoOptimistic: (id, completed) => set((state) => ({
    todos: state.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
  })),
  removeTodoOptimistic: (id) => set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
  })),
  filter: 'all',
  setFilter: (filter) => set({ filter }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  isAdding: false,
  setIsAdding: (adding) => set({ isAdding: adding }),
}));
