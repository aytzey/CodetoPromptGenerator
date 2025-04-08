// File: services/todoServiceHooks.ts
// NEW FILE
import { useCallback } from 'react';
import { useTodoStore } from '@/stores/useTodoStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAppStore } from '@/stores/useAppStore';
import { fetchApi } from './apiService';
import { TodoItem } from '@/types'; // Define TodoItem in types/index.ts or similar

export function useTodoService() {
    const {
        setTodos, setIsLoading,
        addTodoOptimistic, updateTodoOptimistic, removeTodoOptimistic,
        setIsAdding
    } = useTodoStore();
    const { projectPath } = useProjectStore(); // Need project path
    const { setError } = useAppStore();

    const loadTodos = useCallback(async () => {
        // Get latest project path from store
        const currentProjectPath = useProjectStore.getState().projectPath;
        // If no project path, maybe load global todos? Decide based on requirements.
        // For now, only load if projectPath exists.
        if (!currentProjectPath) {
            setTodos([]); // Clear todos if no project path
            return;
        }

        setIsLoading(true);
        setError(null);
        const url = `/api/todos?projectPath=${encodeURIComponent(currentProjectPath)}`;
        const result = await fetchApi<TodoItem[]>(url);
        if (result) {
            setTodos(result);
        } else {
            setTodos([]); // Clear on failure
        }
        setIsLoading(false);
    }, [setIsLoading, setTodos, setError]); // projectPath implicit

    const addTodo = useCallback(async (text: string): Promise<boolean> => {
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
        setError(null);

        // Optimistic UI update (optional but good for UX)
        // Create a temporary ID or structure
        // const optimisticTodo: TodoItem = { id: Date.now(), text: trimmedText, completed: false, createdAt: new Date().toISOString() };
        // addTodoOptimistic(optimisticTodo);

        const body = { text: trimmedText, createdAt: new Date().toISOString() };
        const url = `/api/todos?projectPath=${encodeURIComponent(currentProjectPath)}`;
        const result = await fetchApi<TodoItem>(url, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        if (result) {
            // If using optimistic update, you might just refresh the list or update the temp ID
            await loadTodos(); // Refresh the list to get the real data
            setIsAdding(false);
            return true;
        } else {
            // Revert optimistic update if it failed
            // removeTodoOptimistic(optimisticTodo.id);
            await loadTodos(); // Refresh list to be sure of state
            setIsAdding(false);
            // Error handled by fetchApi
            return false;
        }
    }, [setError, setIsAdding, loadTodos]); // projectPath implicit

    const toggleTodo = useCallback(async (id: number, currentStatus: boolean): Promise<boolean> => {
         const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
            setError("Cannot toggle todo without a project path.");
            return false;
        }
        setError(null);

        // Optimistic update
        updateTodoOptimistic(id, !currentStatus);

        const body = { completed: !currentStatus };
        const url = `/api/todos/${id}?projectPath=${encodeURIComponent(currentProjectPath)}`;
        const result = await fetchApi<TodoItem>(url, {
            method: 'PUT',
            body: JSON.stringify(body),
        });

        if (!result) {
            // Revert optimistic update on failure
            updateTodoOptimistic(id, currentStatus);
            // Error handled by fetchApi
            return false;
        }
        // Optional: Update store with the confirmed data from result if different
        // setTodos( /* logic to merge result into existing todos */ );
        return true;
    }, [setError, updateTodoOptimistic]); // projectPath implicit

    const deleteTodo = useCallback(async (id: number): Promise<boolean> => {
         const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
            setError("Cannot delete todo without a project path.");
            return false;
        }
        setError(null);

        // Store current state for potential revert
        const currentTodos = useTodoStore.getState().todos;
        const todoToRemove = currentTodos.find(t => t.id === id);

        // Optimistic update
        removeTodoOptimistic(id);

        const url = `/api/todos/${id}?projectPath=${encodeURIComponent(currentProjectPath)}`;
        // fetchApi returns null for 204 No Content, which is expected for DELETE success
        const response = await fetchApi<null>(url, { method: 'DELETE' });

        // If fetchApi didn't set an error, the DELETE was likely successful (returned 204 or ok=true)
        // If fetchApi *did* set an error, we need to revert.
        const wasErrorSet = useAppStore.getState().error !== null;

        if (wasErrorSet) {
             console.error(`Failed to delete todo ${id}. Reverting UI.`);
             // Revert: restore the previous state
             if (todoToRemove) {
                 setTodos(currentTodos);
             }
             return false;
        }
        // Success
        return true;
    }, [setError, removeTodoOptimistic, setTodos]); // projectPath implicit

     const clearCompletedTodos = useCallback(async (): Promise<boolean> => {
        const currentProjectPath = useProjectStore.getState().projectPath;
        if (!currentProjectPath) {
            setError("Cannot clear completed todos without a project path.");
            return false;
        }
        setError(null);

        const currentTodos = useTodoStore.getState().todos;
        const completedTodos = currentTodos.filter(t => t.completed);
        if (completedTodos.length === 0) return true; // Nothing to clear

        // Optimistic UI update
        const activeTodos = currentTodos.filter(t => !t.completed);
        setTodos(activeTodos);

        let allSucceeded = true;
        // Sequentially delete completed todos
        for (const todo of completedTodos) {
            const url = `/api/todos/${todo.id}?projectPath=${encodeURIComponent(currentProjectPath)}`;
            const response = await fetchApi<null>(url, { method: 'DELETE' });
             const wasErrorSet = useAppStore.getState().error !== null;
             if (wasErrorSet) {
                 allSucceeded = false;
                 // Log specific error, but continue trying others? Or stop? Stop for now.
                 setError(`Failed to delete todo "${todo.text}". Others may not have been cleared.`);
                 break; // Stop processing further deletes on error
             }
        }

        // If any deletion failed, reload the list to get the true state from backend
        if (!allSucceeded) {
            await loadTodos();
            return false;
        }

        return true; // All attempted deletions succeeded without error
    }, [setError, setTodos, loadTodos]); // projectPath implicit


    return { loadTodos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos };
}
