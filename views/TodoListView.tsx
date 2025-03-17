import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  CircleSlash,
  Trash2,
  Plus,
  List,
  Calendar,
  Loader2,
  X,
  ListTodo,
  ListChecks,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  createdAt?: string;
}

interface TodoListViewProps {
  projectPath: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const TodoListView: React.FC<TodoListViewProps> = ({ projectPath }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingTodo, setAddingTodo] = useState(false);

  useEffect(() => {
    loadTodos();
  }, [projectPath]);

  async function loadTodos() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/todos?projectPath=${encodeURIComponent(
          projectPath
        )}`
      );
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.success) {
        setTodos(data.data);
      } else {
        setError(data.error || "Failed to load todos");
      }
    } catch (err: any) {
      setError("Error fetching todos: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addTodo() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setError(null);
    setAddingTodo(true);
    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/todos?projectPath=${encodeURIComponent(
          projectPath
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            createdAt: new Date().toISOString(),
          }),
        }
      );
      if (!resp.ok) {
        if (resp.status === 400) {
          setError("Todo text is required.");
          return;
        }
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.success) {
        setTodos((prev) => [...prev, data.data]);
        setInputValue("");
      } else {
        setError(data.error || "Failed to add todo");
      }
    } catch (err: any) {
      setError("Error adding todo: " + err.message);
    } finally {
      setAddingTodo(false);
    }
  }

  async function toggleComplete(id: number, currentStatus: boolean) {
    try {
      // Optimistically update UI
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !currentStatus } : t))
      );

      const resp = await fetch(
        `${BACKEND_URL}/api/todos/${id}?projectPath=${encodeURIComponent(
          projectPath
        )}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !currentStatus }),
        }
      );
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (!data.success) {
        // Revert on failure
        setTodos((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, completed: currentStatus } : t
          )
        );
        setError(data.error || "Failed to update task status");
      }
    } catch (err: any) {
      // Revert on error
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: currentStatus } : t))
      );
      setError("Error toggling todo: " + err.message);
    }
  }

  async function deleteTodo(id: number) {
    // Store the todo for potential restoration
    const todoToDelete = todos.find((t) => t.id === id);

    // Optimistically remove from UI
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/todos/${id}?projectPath=${encodeURIComponent(
          projectPath
        )}`,
        { method: "DELETE" }
      );
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (!data.success) {
        // Restore on failure
        if (todoToDelete) {
          setTodos((prev) => [...prev, todoToDelete]);
        }
        setError(data.error || "Failed to delete todo");
      }
    } catch (err: any) {
      // Restore on error
      if (todoToDelete) {
        setTodos((prev) => [...prev, todoToDelete]);
      }
      setError("Error deleting todo: " + err.message);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      addTodo();
    }
  };

  // Filter todos based on current filter
  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true; // 'all'
  });

  // Counts for badges
  const activeTodosCount = todos.filter((t) => !t.completed).length;
  const completedTodosCount = todos.filter((t) => t.completed).length;

  // Clear all completed todos
  async function clearCompleted() {
    // Store completed todos for potential restoration
    const completedTodos = todos.filter((t) => t.completed);

    // Optimistically update UI
    setTodos((prev) => prev.filter((t) => !t.completed));

    try {
      // Delete completed todos one by one
      let hasErrors = false;
      const deletionErrors = [];

      for (const todo of completedTodos) {
        try {
          const resp = await fetch(
            `${BACKEND_URL}/api/todos/${
              todo.id
            }?projectPath=${encodeURIComponent(projectPath)}`,
            { method: "DELETE" }
          );

          if (!resp.ok) {
            hasErrors = true;
            deletionErrors.push(`Failed to delete task #${todo.id}`);
          }

          const data = await resp.json();
          if (!data.success) {
            hasErrors = true;
            deletionErrors.push(
              data.error || `Failed to delete task #${todo.id}`
            );
          }
        } catch (err: any) {
          hasErrors = true;
          deletionErrors.push(
            `Error deleting task #${todo.id}: ${err.message}`
          );
        }
      }

      if (hasErrors) {
        // If there were any errors, reload the todos to get accurate state
        loadTodos();
        setError(
          `Some tasks could not be deleted: ${deletionErrors
            .slice(0, 2)
            .join(", ")}${deletionErrors.length > 2 ? "..." : ""}`
        );
      }
    } catch (err: any) {
      // Restore on catastrophic error
      setTodos((prev) => [...prev, ...completedTodos]);
      setError("Error clearing completed todos: " + err.message);

      // Reload to be safe
      loadTodos();
    }
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <ClipboardList size={20} />
          Project Tasks
          {!loading && todos.length > 0 && (
            <Badge className="ml-2 bg-purple-500 text-white">
              {todos.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert
            variant="destructive"
            className="bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 py-2"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add a new task..."
              className="pr-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={handleKeyDown}
              disabled={addingTodo || loading}
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => setInputValue("")}
                disabled={addingTodo || loading}
              >
                <X size={14} />
              </Button>
            )}
          </div>
          <Button
            onClick={addTodo}
            disabled={addingTodo || loading || !inputValue.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {addingTodo ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Plus size={16} className="mr-1" />
                Add
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select
              value={filter}
              onValueChange={(value) =>
                setFilter(value as "all" | "active" | "completed")
              }
            >
              <SelectTrigger className="w-32 h-8 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <SelectValue placeholder="Filter tasks" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="text-gray-800 dark:text-gray-200"
                >
                  <div className="flex items-center">
                    <List
                      size={14}
                      className="mr-2 text-gray-500 dark:text-gray-400"
                    />
                    All Tasks
                  </div>
                </SelectItem>
                <SelectItem
                  value="active"
                  className="text-gray-800 dark:text-gray-200"
                >
                  <div className="flex items-center">
                    <ListTodo
                      size={14}
                      className="mr-2 text-blue-500 dark:text-blue-400"
                    />
                    Active Tasks
                  </div>
                </SelectItem>
                <SelectItem
                  value="completed"
                  className="text-gray-800 dark:text-gray-200"
                >
                  <div className="flex items-center">
                    <ListChecks
                      size={14}
                      className="mr-2 text-green-500 dark:text-green-400"
                    />
                    Completed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
              >
                {activeTodosCount} active
              </Badge>
              <Badge
                variant="outline"
                className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
              >
                {completedTodosCount} done
              </Badge>
            </div>
          </div>

          {completedTodosCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCompleted}
                    className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
                  >
                    <CircleSlash size={14} className="mr-1" />
                    Clear Completed
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove all completed tasks</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-2" />
            <p>Loading tasks...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <ClipboardList size={32} className="mb-2 opacity-50" />
            <p>
              {filter === "all"
                ? "No tasks found."
                : filter === "active"
                ? "No active tasks."
                : "No completed tasks."}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[250px] pr-4">
            <ul className="space-y-2">
              {filteredTodos.map((todo) => (
                <li
                  key={todo.id}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    todo.completed
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  } transition-colors duration-200`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() =>
                        toggleComplete(todo.id, todo.completed)
                      }
                      className={`${
                        todo.completed
                          ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`${
                          todo.completed
                            ? "line-through text-gray-500 dark:text-gray-400"
                            : "text-gray-800 dark:text-gray-200"
                        } truncate`}
                      >
                        {todo.text}
                      </span>
                      {todo.createdAt && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Calendar size={10} className="mr-1" />
                          {new Date(todo.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTodo(todo.id)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Delete task</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {todos.length > 0 && !loading && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTodos}
              className="text-xs h-7 border-gray-200 dark:border-gray-700"
            >
              <RefreshCw size={12} className="mr-1" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodoListView;
