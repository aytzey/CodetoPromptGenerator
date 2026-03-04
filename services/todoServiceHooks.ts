import { useCallback } from "react";
import { useTodoStore } from "@/stores/useTodoStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { fetchApiResult } from "./apiService";
import type { TodoItem } from "@/types";

export function useTodoService() {
  const {
    setTodos,
    setIsLoading,
    updateTodoOptimistic,
    removeTodoOptimistic,
    setIsAdding,
  } = useTodoStore();
  const { setError } = useAppStore();

  const loadTodos = useCallback(async () => {
    const currentProjectPath = useProjectStore.getState().projectPath;
    if (!currentProjectPath) {
      setTodos([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = `/api/todos?projectPath=${encodeURIComponent(currentProjectPath)}`;
      const result = await fetchApiResult<TodoItem[]>(url);
      setTodos(result.ok && result.data ? result.data : []);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setTodos]);

  const addTodo = useCallback(
    async (text: string): Promise<boolean> => {
      const currentProjectPath = useProjectStore.getState().projectPath;
      if (!currentProjectPath) {
        setError("Cannot add todo without a project path.");
        return false;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        setError("Todo text cannot be empty.");
        return false;
      }

      setIsAdding(true);
      try {
        const url = `/api/todos?projectPath=${encodeURIComponent(currentProjectPath)}`;
        const result = await fetchApiResult<TodoItem>(url, {
          method: "POST",
          body: JSON.stringify({ text: trimmedText, createdAt: new Date().toISOString() }),
        });
        if (!result.ok) return false;
        await loadTodos();
        return true;
      } finally {
        setIsAdding(false);
      }
    },
    [loadTodos, setError, setIsAdding],
  );

  const toggleTodo = useCallback(
    async (id: number, currentStatus: boolean): Promise<boolean> => {
      const currentProjectPath = useProjectStore.getState().projectPath;
      if (!currentProjectPath) {
        setError("Cannot toggle todo without a project path.");
        return false;
      }

      updateTodoOptimistic(id, !currentStatus);
      const url = `/api/todos/${id}?projectPath=${encodeURIComponent(currentProjectPath)}`;
      const result = await fetchApiResult<TodoItem>(url, {
        method: "PUT",
        body: JSON.stringify({ completed: !currentStatus }),
      });
      if (result.ok) return true;

      updateTodoOptimistic(id, currentStatus);
      return false;
    },
    [setError, updateTodoOptimistic],
  );

  const deleteTodo = useCallback(
    async (id: number): Promise<boolean> => {
      const currentProjectPath = useProjectStore.getState().projectPath;
      if (!currentProjectPath) {
        setError("Cannot delete todo without a project path.");
        return false;
      }

      const snapshot = useTodoStore.getState().todos;
      removeTodoOptimistic(id);

      const url = `/api/todos/${id}?projectPath=${encodeURIComponent(currentProjectPath)}`;
      const result = await fetchApiResult<null>(url, { method: "DELETE" });
      if (result.ok) return true;

      setTodos(snapshot);
      return false;
    },
    [removeTodoOptimistic, setError, setTodos],
  );

  const clearCompletedTodos = useCallback(async (): Promise<boolean> => {
    const currentProjectPath = useProjectStore.getState().projectPath;
    if (!currentProjectPath) {
      setError("Cannot clear completed todos without a project path.");
      return false;
    }

    const snapshot = useTodoStore.getState().todos;
    const completedTodos = snapshot.filter((todo) => todo.completed);
    if (completedTodos.length === 0) return true;

    setTodos(snapshot.filter((todo) => !todo.completed));

    for (const todo of completedTodos) {
      const url = `/api/todos/${todo.id}?projectPath=${encodeURIComponent(currentProjectPath)}`;
      const result = await fetchApiResult<null>(url, { method: "DELETE" });
      if (!result.ok) {
        setError(`Failed to delete todo "${todo.text}".`);
        await loadTodos();
        return false;
      }
    }

    return true;
  }, [loadTodos, setError, setTodos]);

  return { loadTodos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos };
}
