// File: views/TodoListView.tsx
// REFACTOR / OVERWRITE
import React, { useEffect, useState } from "react";
import { useTodoStore } from "@/stores/useTodoStore"; // Use Zustand Store
import { useTodoService } from "@/services/todoServiceHooks"; // Use Service Hook

// Keep UI component imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle, CheckCircle, CircleSlash, Trash2, Plus, List, Calendar,
  Loader2, X, ListTodo, ListChecks, ClipboardList, RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TodoItem, TodoFilter } from '@/types'; // Import types

// Removed props: projectPath (obtained from store)
const TodoListView: React.FC = () => {
  // Get state and actions from Zustand store
  const { todos, filter, setFilter, isLoading, isAdding } = useTodoStore();
  // Get service functions from hook
  const { loadTodos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos } = useTodoService();

  const [inputValue, setInputValue] = useState("");
  // Local error state is removed, global error is handled in _app.tsx

  // Load todos when the component mounts or when the service thinks it should reload
  // (e.g., after project path changes, handled implicitly by the service hook structure)
  useEffect(() => {
    loadTodos();
    // Dependency array includes the function reference from the hook.
    // If projectPath changes, the hook reference might change or internal logic handles it.
  }, [loadTodos]);

  const handleAddTodo = async () => {
    const success = await addTodo(inputValue);
    if (success) {
      setInputValue(""); // Clear input on successful addition
    }
    // Errors are handled globally by the service hook / fetchApi
  };

  const handleToggleComplete = async (id: number, currentStatus: boolean) => {
    await toggleTodo(id, currentStatus);
    // Optimistic update is handled in the store, revert logic in service hook
  };

  const handleDeleteTodo = async (id: number) => {
    await deleteTodo(id);
    // Optimistic update handled in store, revert in service hook
  };

   const handleClearCompleted = async () => {
     await clearCompletedTodos();
     // Optimistic update/revert handled in service hook
   };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      handleAddTodo();
    }
  };

  // Filter todos based on current filter state from store
  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true; // 'all'
  });

  // Counts for badges
  const activeTodosCount = todos.filter((t) => !t.completed).length;
  const completedTodosCount = todos.filter((t) => t.completed).length;

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <ClipboardList size={20} />
          Project Tasks
          {/* Show count only when not loading and todos exist */}
          {!isLoading && todos.length > 0 && (
            <Badge className="ml-2 bg-purple-500 text-white">
              {todos.length} total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Global error is displayed in _app.tsx, remove local error display */}
        {/* {error && ( ... )} */}

        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add a new task..."
              className="pr-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={handleKeyDown}
              disabled={isAdding || isLoading}
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => setInputValue("")}
                disabled={isAdding || isLoading}
              >
                <X size={14} />
              </Button>
            )}
          </div>
          <Button
            onClick={handleAddTodo}
            disabled={isAdding || isLoading || !inputValue.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white w-[70px]" // Fixed width for loader
          >
            {isAdding ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Plus size={16} className="mr-1" />
                Add
              </>
            )}
          </Button>
        </div>

        {/* Filters and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Select
              value={filter}
              onValueChange={(value) => setFilter(value as TodoFilter)} // Use setFilter from store
            >
              <SelectTrigger className="w-32 h-8 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <SelectValue placeholder="Filter tasks" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectItem value="all" className="text-gray-800 dark:text-gray-200">
                  <div className="flex items-center"><List size={14} className="mr-2 text-gray-500 dark:text-gray-400" />All Tasks</div>
                </SelectItem>
                <SelectItem value="active" className="text-gray-800 dark:text-gray-200">
                  <div className="flex items-center"><ListTodo size={14} className="mr-2 text-blue-500 dark:text-blue-400" />Active</div>
                </SelectItem>
                <SelectItem value="completed" className="text-gray-800 dark:text-gray-200">
                  <div className="flex items-center"><ListChecks size={14} className="mr-2 text-green-500 dark:text-green-400" />Completed</div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                {activeTodosCount} active
              </Badge>
              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                {completedTodosCount} done
              </Badge>
            </div>
          </div>

          {completedTodosCount > 0 && (
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                   <Button
                    variant="outline" size="sm" onClick={handleClearCompleted}
                    className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
                    disabled={isLoading} // Disable while any loading is happening
                  >
                    <CircleSlash size={14} className="mr-1" /> Clear Completed
                   </Button>
                </TooltipTrigger>
                <TooltipContent><p>Remove all completed tasks</p></TooltipContent>
              </Tooltip>
             </TooltipProvider>
          )}
        </div>

         {/* Todo List Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <Loader2 size={32} className="animate-spin mb-2" />
            <p>Loading tasks...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <ClipboardList size={32} className="mb-2 opacity-50" />
            <p>
              {filter === "all" ? "No tasks found." :
               filter === "active" ? "No active tasks." : "No completed tasks."}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[250px] pr-4">
            <ul className="space-y-2">
              {filteredTodos.map((todo) => (
                <li key={todo.id} className={`flex items-center justify-between p-3 rounded-md border ${
                    todo.completed
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50 opacity-70"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  } transition-all duration-200 group`}>

                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo.id, todo.completed)}
                      id={`todo-${todo.id}`} // Add id for label association
                      className={`${
                        todo.completed
                          ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                    <label htmlFor={`todo-${todo.id}`} className="flex flex-col min-w-0 cursor-pointer">
                       <span className={`${
                          todo.completed
                            ? "line-through text-gray-500 dark:text-gray-400"
                            : "text-gray-800 dark:text-gray-200"
                        } truncate`}>
                         {todo.text}
                       </span>
                       {todo.createdAt && (
                         <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                           <Calendar size={10} className="mr-1" />
                           {new Date(todo.createdAt).toLocaleDateString()}
                         </span>
                       )}
                     </label>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button
                          variant="ghost" size="sm" onClick={() => handleDeleteTodo(todo.id)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Delete task ${todo.text}`}
                         >
                          <Trash2 size={16} />
                         </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left"><p>Delete task</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {/* Refresh Button */}
        {todos.length > 0 && !isLoading && (
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={loadTodos} className="text-xs h-7 border-gray-200 dark:border-gray-700">
              <RefreshCw size={12} className="mr-1" /> Refresh List
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodoListView; // No React.memo needed if state is managed by Zustand correctly
