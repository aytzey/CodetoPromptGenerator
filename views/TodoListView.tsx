// File: views/TodoListView.tsx
import React, { useEffect } from "react";
import { useTodoStore } from "@/stores/useTodoStore";
import { useTodoService } from "@/services/todoServiceHooks";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle, CheckCircle, CircleSlash, Trash2, Plus, List, Calendar,
  Loader2, X, ListTodo, ListChecks, ClipboardList, RefreshCw, Check,
  ChevronRight, LinkIcon, Clock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TodoItem, TodoFilter } from '@/types';

const TodoListView: React.FC = () => {
  // Get state and actions from Zustand store
  const { todos, filter, setFilter, isLoading, isAdding } = useTodoStore();
  
  // Get service functions from hook
  const { loadTodos, addTodo, toggleTodo, deleteTodo, clearCompletedTodos } = useTodoService();

  // Local state for input
  const [inputValue, setInputValue] = React.useState("");
  const [hoveredTaskId, setHoveredTaskId] = React.useState<number | null>(null);

  // Load todos when component mounts
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleAddTodo = async () => {
    if (!inputValue.trim()) return;
    const success = await addTodo(inputValue);
    if (success) {
      setInputValue(""); // Clear input on successful addition
    }
  };

  const handleToggleComplete = async (id: number, currentStatus: boolean) => {
    await toggleTodo(id, currentStatus);
  };

  const handleDeleteTodo = async (id: number) => {
    await deleteTodo(id);
  };

  const handleClearCompleted = async () => {
    await clearCompletedTodos();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      handleAddTodo();
    }
  };

  // Filter todos based on current filter state
  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true; // 'all'
  });

  // Format date to display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Calculate statistics
  const activeTodosCount = todos.filter((t) => !t.completed).length;
  const completedTodosCount = todos.filter((t) => t.completed).length;
  const completionRate = todos.length > 0 
    ? Math.round((completedTodosCount / todos.length) * 100) 
    : 0;

  return (
    <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-fade-in">
      <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(189,147,249)] to-[rgb(255,121,198)]">
          <ClipboardList size={18} className="text-[rgb(189,147,249)]" />
          Project Tasks
          {!isLoading && todos.length > 0 && (
            <Badge className="ml-auto bg-[rgba(189,147,249,0.15)] text-[rgb(189,147,249)] border border-[rgba(189,147,249,0.3)]">
              {todos.length} total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4 bg-[rgba(22,23,46,0.5)]">
        {/* Task Input with enhanced styling */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-[rgba(189,147,249,0.1)] border-r border-[rgba(60,63,87,0.7)] rounded-l-lg">
            <Plus size={18} className="text-[rgb(189,147,249)]" />
          </div>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new task..."
            className="pl-12 h-11 bg-[rgba(22,23,46,0.6)] border-[rgba(60,63,87,0.7)] focus:ring-2 focus:ring-[rgb(189,147,249)] focus:border-transparent text-[rgb(224,226,240)]"
            onKeyDown={handleKeyDown}
            disabled={isAdding || isLoading}
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8 text-[rgb(140,143,170)] hover:text-[rgb(224,226,240)]"
              onClick={() => setInputValue("")}
              disabled={isAdding || isLoading}
            >
              <X size={16} />
            </Button>
          )}
          <Button
            onClick={handleAddTodo}
            disabled={isAdding || isLoading || !inputValue.trim()}
            className="absolute right-0 top-0 bottom-0 px-4 rounded-l-none bg-gradient-to-r from-[rgb(189,147,249)] to-[rgb(189,147,249)] hover:from-[rgb(189,147,249)] hover:to-[rgb(255,121,198)] text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300"
          >
            {isAdding ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline mr-1.5">Add</span>
                <ChevronRight size={16} className="animate-pulse" />
              </>
            )}
          </Button>
        </div>

        {/* Task Stats and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {/* Completion Rate */}
          <div className="bg-[rgba(15,16,36,0.4)] rounded-lg border border-[rgba(60,63,87,0.7)] p-3 flex flex-col">
            <div className="text-xs text-[rgb(140,143,170)] mb-1.5">Completion Rate</div>
            <div className="flex items-center justify-between">
              <div className="text-xl font-semibold text-[rgb(224,226,240)]">{completionRate}%</div>
              <div className="relative w-16 h-16">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <circle 
                    cx="18" cy="18" r="16" 
                    fill="none" 
                    className="stroke-[rgba(60,63,87,0.5)] stroke-2" 
                  />
                  <circle 
                    cx="18" cy="18" r="16" 
                    fill="none" 
                    className="stroke-[rgb(189,147,249)] stroke-2" 
                    strokeDasharray={`${completionRate} 100`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                  <text 
                    x="18" y="20.5" 
                    className="text-[rgb(189,147,249)] text-xs font-medium"
                    textAnchor="middle"
                    fill="currentColor"
                  >
                    {completionRate}%
                  </text>
                </svg>
              </div>
            </div>
            <div className="h-1 w-full bg-[rgba(15,16,36,0.5)] rounded-full mt-1.5">
              <div 
                className="h-1 bg-gradient-to-r from-[rgb(189,147,249)] to-[rgb(255,121,198)] rounded-full"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
          
          {/* Tasks Count */}
          <div className="bg-[rgba(15,16,36,0.4)] rounded-lg border border-[rgba(60,63,87,0.7)] p-3">
            <div className="text-xs text-[rgb(140,143,170)] mb-1.5">Tasks</div>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center text-[rgb(80,250,123)] text-sm">
                  <CheckCircle size={14} className="mr-1" />
                  <span>{completedTodosCount} completed</span>
                </div>
                <div className="flex items-center text-[rgb(123,147,253)] text-sm mt-0.5">
                  <Clock size={14} className="mr-1" />
                  <span>{activeTodosCount} active</span>
                </div>
              </div>
              <div className="text-xl font-semibold text-[rgb(224,226,240)]">{todos.length}</div>
            </div>
          </div>
          
          {/* Filter */}
          <div className="bg-[rgba(15,16,36,0.4)] rounded-lg border border-[rgba(60,63,87,0.7)] p-3">
            <div className="text-xs text-[rgb(140,143,170)] mb-1.5">Filter Tasks</div>
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as TodoFilter)}
            >
              <SelectTrigger className="w-full h-9 bg-[rgba(22,23,46,0.6)] border-[rgba(60,63,87,0.7)] text-[rgb(224,226,240)] focus:ring-2 focus:ring-[rgb(189,147,249)] focus:border-transparent text-sm">
                <SelectValue placeholder="Filter tasks" />
              </SelectTrigger>
              <SelectContent className="bg-[rgb(22,23,46)] text-[rgb(224,226,240)] border-[rgba(60,63,87,0.7)]">
                <SelectItem value="all" className="text-[rgb(224,226,240)] focus:bg-[rgba(189,147,249,0.1)] focus:text-[rgb(224,226,240)]">
                  <div className="flex items-center">
                    <List size={14} className="mr-2 text-[rgb(140,143,170)]" />
                    All Tasks
                  </div>
                </SelectItem>
                <SelectItem value="active" className="text-[rgb(224,226,240)] focus:bg-[rgba(189,147,249,0.1)] focus:text-[rgb(224,226,240)]">
                  <div className="flex items-center">
                    <ListTodo size={14} className="mr-2 text-[rgb(123,147,253)]" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="completed" className="text-[rgb(224,226,240)] focus:bg-[rgba(189,147,249,0.1)] focus:text-[rgb(224,226,240)]">
                  <div className="flex items-center">
                    <ListChecks size={14} className="mr-2 text-[rgb(80,250,123)]" />
                    Completed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Separator with action */}
        <div className="relative flex py-2 items-center">
          <Separator className="flex-grow bg-[rgba(60,63,87,0.5)]" />
          {completedTodosCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearCompleted}
                    className="mx-4 h-7 text-xs border-[rgba(255,85,85,0.4)] bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] hover:bg-[rgba(255,85,85,0.2)] hover:text-[rgb(255,85,85)] hover:border-[rgba(255,85,85,0.5)]"
                    disabled={isLoading}
                  >
                    <CircleSlash size={14} className="mr-1" /> Clear Completed
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                  <p>Remove all completed tasks</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Separator className="flex-grow bg-[rgba(60,63,87,0.5)]" />
        </div>

        {/* Task List Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[rgb(140,143,170)]">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-[rgb(189,147,249)] animate-spin"></div>
              <div className="w-12 h-12 rounded-full border-l-2 border-r-2 border-[rgb(255,121,198)] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <ClipboardList size={18} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[rgb(224,226,240)]" />
            </div>
            <p className="mt-4">Loading tasks...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[rgb(140,143,170)]">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-[rgba(60,63,87,0.2)]">
              <ClipboardList size={28} className="opacity-60" />
            </div>
            <p className="mt-4 text-lg">
              {filter === "all" ? "No tasks found" :
               filter === "active" ? "No active tasks" : "No completed tasks"}
            </p>
            <p className="text-sm mt-1 max-w-xs text-center">
              {filter === "all" 
                ? "Add a new task using the input field above" 
                : `Switch to '${filter === "active" ? "Completed" : "Active"}' or 'All' to see other tasks`}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <ul className="space-y-2">
              {filteredTodos.map((todo, index) => (
                <li 
                  key={todo.id} 
                  className={`relative overflow-hidden rounded-lg border transition-all duration-200 animate-fade-in group
                    ${todo.completed
                      ? "border-[rgba(80,250,123,0.3)] bg-[rgba(80,250,123,0.05)]"
                      : "border-[rgba(60,63,87,0.7)] bg-[rgba(22,23,46,0.6)] hover:border-[rgba(123,147,253,0.4)] hover:bg-[rgba(123,147,253,0.05)]"
                    }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onMouseEnter={() => setHoveredTaskId(todo.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  {/* Border accent line */}
                  <div 
                    className={`absolute left-0 top-0 bottom-0 w-1 
                      ${todo.completed 
                        ? "bg-[rgb(80,250,123)]" 
                        : "bg-[rgb(123,147,253)]"
                      }`}
                  ></div>
                  
                  <div className="flex items-center p-3 pl-4">
                    {/* Checkbox with custom styling */}
                    <div className="mr-3">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => handleToggleComplete(todo.id, todo.completed)}
                        id={`todo-${todo.id}`}
                        className={`h-5 w-5 rounded-md transition-colors duration-200
                          ${todo.completed
                            ? "data-[state=checked]:bg-[rgb(80,250,123)] data-[state=checked]:border-[rgb(80,250,123)]"
                            : "border-[rgba(123,147,253,0.5)] data-[state=checked]:bg-[rgb(123,147,253)] data-[state=checked]:border-[rgb(123,147,253)]"
                          }`}
                      />
                    </div>
                    
                    {/* Task content */}
                    <label 
                      htmlFor={`todo-${todo.id}`} 
                      className="flex flex-col cursor-pointer flex-grow min-w-0"
                    >
                      <span className={`truncate text-base
                        ${todo.completed
                          ? "line-through text-[rgb(140,143,170)]"
                          : "text-[rgb(224,226,240)]"
                        }`}>
                        {todo.text}
                      </span>
                      
                      {todo.createdAt && (
                        <span className="text-xs text-[rgb(140,143,170)] mt-0.5 flex items-center">
                          <Calendar size={10} className="mr-1" />
                          Added {formatDate(todo.createdAt)}
                        </span>
                      )}
                    </label>
                    
                    {/* Status badge - Only shows for completed tasks */}
                    {todo.completed && (
                      <Badge className="ml-2 bg-[rgba(80,250,123,0.1)] text-[rgb(80,250,123)] border border-[rgba(80,250,123,0.3)] flex items-center px-2">
                        <Check size={10} className="mr-1" />
                        Done
                      </Badge>
                    )}
                    
                    {/* Delete button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteTodo(todo.id)}
                            className={`h-8 w-8 ml-2 rounded-full 
                              ${hoveredTaskId === todo.id 
                                ? "opacity-100 bg-[rgba(255,85,85,0.1)] text-[rgb(255,85,85)] hover:bg-[rgba(255,85,85,0.2)]" 
                                : "opacity-0"
                              } transition-opacity duration-200`}
                            aria-label={`Delete task ${todo.text}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)]">
                          <p>Delete task</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {/* Refresh Button */}
        {todos.length > 0 && !isLoading && (
          <div className="flex justify-end mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadTodos} 
              className="text-xs h-8 bg-transparent border-[rgba(60,63,87,0.7)] text-[rgb(140,143,170)] hover:bg-[rgba(60,63,87,0.2)] hover:text-[rgb(224,226,240)] hover:border-[rgba(60,63,87,0.8)]"
            >
              <RefreshCw size={12} className="mr-1.5" /> Refresh List
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodoListView;