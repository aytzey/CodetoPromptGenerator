// FILE: views/KanbanBoardView.tsx
// ---------------------------------------------------------------------
// Redesigned Kanban Board with improved animations and usability
// ---------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  KanbanItem,
  KanbanPriority,
  KanbanStatus,
  KanbanStatusValues,
  Task,
} from '@/types';
import { useKanbanStore } from '@/stores/useKanbanStore';
import { useKanbanService } from '@/services/kanbanServiceHooks';
import { useUserStoryStore } from '@/stores/useUserStoryStore';
import { useUserStoryService } from '@/services/userStoryServiceHooks'; 
import { format, isPast, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  ListTodo,
  X,
  Search,
  Filter,
  MoreVertical,
  Circle,
  Sparkles,
  Flag,
  BookOpen,
} from 'lucide-react';

import KanbanEditModal from './KanbanEditModal';
import TaskStoryAssociationModal from './TaskStoryAssociationModal';

/* =================================================================== */
/* Constants & Configurations                                          */
/* =================================================================== */
const COLUMN_CONFIG: Record<KanbanStatus, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  todo: {
    name: 'To Do',
    icon: <Circle size={14} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/20',
  },
  'in-progress': {
    name: 'In Progress',
    icon: <Clock size={14} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/20',
  },
  done: {
    name: 'Done',
    icon: <CheckCircle2 size={14} />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/20',
  },
};

const PRIORITY_CONFIG = {
  low: {
    icon: <Flag size={11} />,
    label: 'Low',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  medium: {
    icon: <Flag size={11} />,
    label: 'Medium',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  high: {
    icon: <Flag size={11} />,
    label: 'High',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
};

/* =================================================================== */
/* Task Card Component                                                 */
/* =================================================================== */
interface TaskCardProps {
  item: Task;
  onEdit: () => void;
  onDelete: () => void;
  onManageStories: () => void;
  isDragging: boolean;
  dragHandleProps: any;
}

const TaskCard = React.memo(
  React.forwardRef<HTMLDivElement, TaskCardProps>(
    ({ item, onEdit, onDelete, onManageStories, isDragging, dragHandleProps, ...rest }, ref) => {
      const getStoriesForTask = useUserStoryStore(s => s.getStoriesForTask);
      const linkedStories = getStoriesForTask(item.id);
      const priorityConfig = PRIORITY_CONFIG[item.priority];
      
      const formatDeadline = (dateStr: string | null | undefined) => {
        if (!dateStr) return null;
        try {
          const date = parseISO(dateStr);
          if (isToday(date)) return 'Today';
          if (isPast(date) && !isToday(date)) return 'Overdue';
          return format(date, 'MMM d');
        } catch {
          return null;
        }
      };

      const deadline = formatDeadline(item.dueDate);
      const isOverdue = deadline === 'Overdue';

      return (
        <div
          ref={ref}
          {...rest}
          {...dragHandleProps}
          className={cn(
            'group relative bg-[rgba(var(--color-bg-secondary),0.3)] hover:bg-[rgba(var(--color-bg-secondary),0.5)]',
            'border border-[rgba(var(--color-border),0.4)] hover:border-[rgba(var(--color-border),0.6)]',
            'rounded-lg p-3 cursor-grab active:cursor-grabbing',
            'transition-all duration-200 ease-out',
            'hover:shadow-sm hover:translate-y-[-1px]',
            isDragging && [
              'shadow-lg !bg-[rgba(var(--color-bg-tertiary),0.9)]',
              'rotate-[2deg] scale-105 opacity-90',
              '!border-[rgba(var(--color-primary),0.5)]'
            ]
          )}
        >
          {/* Priority indicator line */}
          <div
            className={cn(
              'absolute top-0 left-0 w-1 h-full rounded-l-lg transition-all duration-200',
              priorityConfig.bgColor,
              item.priority === 'high' && 'bg-rose-500/40',
              item.priority === 'medium' && 'bg-amber-500/40',
              item.priority === 'low' && 'bg-blue-500/40',
            )}
          />

          {/* Card content */}
          <div className="pl-2">
            <h4 className="text-sm font-medium text-[rgb(var(--color-text-primary))] line-clamp-2 mb-2">
              {item.title}
            </h4>

            {item.details && (
              <p className="text-xs text-[rgb(var(--color-text-muted))] line-clamp-2 mb-2">
                {item.details}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 px-1.5 text-[10px] font-medium border',
                    priorityConfig.bgColor,
                    priorityConfig.borderColor,
                    priorityConfig.color
                  )}
                >
                  {priorityConfig.icon}
                  <span className="ml-0.5">{priorityConfig.label}</span>
                </Badge>

                {deadline && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 px-1.5 text-[10px] font-medium border',
                      isOverdue
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : deadline === 'Today'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    )}
                  >
                    <Calendar size={10} className="mr-0.5" />
                    {deadline}
                  </Badge>
                )}
                
                {linkedStories.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] font-medium cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageStories();
                          }}
                        >
                          <BookOpen size={10} className="mr-0.5" />
                          {linkedStories.length}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Linked to {linkedStories.length} user {linkedStories.length === 1 ? 'story' : 'stories'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Action menu */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[rgb(var(--color-text-muted))]"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Show dropdown menu
                  }}
                >
                  <MoreVertical size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick actions on hover */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-[rgb(var(--color-bg-primary))] border-[rgba(var(--color-border),0.5)] hover:border-[rgba(var(--color-primary),0.5)] hover:text-[rgb(var(--color-primary))]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageStories();
                    }}
                  >
                    <BookOpen size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Link Stories</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-[rgb(var(--color-bg-primary))] border-[rgba(var(--color-border),0.5)] hover:border-[rgba(var(--color-primary),0.5)] hover:text-[rgb(var(--color-primary))]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Edit2 size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 bg-[rgb(var(--color-bg-primary))] border-[rgba(var(--color-border),0.5)] hover:border-rose-500/50 hover:text-rose-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }
  )
);
TaskCard.displayName = 'TaskCard';

/* =================================================================== */
/* Column Component                                                    */
/* =================================================================== */
interface ColumnProps {
  status: KanbanStatus;
  items: Task[];
  onAddTask: (status: KanbanStatus, title: string) => void;
  onEditTask: (item: Task) => void;
  onDeleteTask: (id: number) => void;
  onManageStories: (task: Task) => void;
  isSaving: boolean;
}

const Column: React.FC<ColumnProps> = ({
  status,
  items,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onManageStories,
  isSaving,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const config = COLUMN_CONFIG[status];

  const handleAdd = () => {
    if (newTaskTitle.trim()) {
      onAddTask(status, newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-t-lg',
        config.bgColor,
        'border-b',
        config.borderColor
      )}>
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <h3 className="font-medium text-sm text-[rgb(var(--color-text-primary))]">
            {config.name}
          </h3>
          <Badge
            variant="secondary"
            className="h-5 min-w-[20px] px-1 text-[10px] bg-[rgba(var(--color-surface),0.5)]"
          >
            {items.length}
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 transition-all duration-200',
            config.color,
            'hover:bg-[rgba(var(--color-surface),0.5)]'
          )}
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* Tasks list */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 p-2 space-y-2 min-h-[200px] transition-all duration-200',
              snapshot.isDraggingOver && [
                config.bgColor,
                'ring-2 ring-inset',
                config.borderColor.replace('border-', 'ring-'),
                'rounded-lg'
              ]
            )}
          >
            {/* Add new task input */}
            {isAdding && (
              <div 
                className="p-2 bg-[rgba(var(--color-bg-secondary),0.5)] rounded-lg border border-[rgba(var(--color-border),0.4)] animate-slide-down"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsAdding(false);
                      setNewTaskTitle('');
                    }
                  }}
                  placeholder="Task title..."
                  className="w-full h-8 text-sm bg-transparent border-0 outline-none placeholder:text-[rgb(var(--color-text-muted))] px-2"
                  disabled={isSaving}
                  autoComplete="off"
                />
                <div className="flex justify-end gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAdding(false);
                      setNewTaskTitle('');
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      'h-7 px-3 text-xs',
                      'bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))]/90'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!newTaskTitle.trim() || isSaving}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks */}
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <TaskCard
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    dragHandleProps={provided.dragHandleProps}
                    item={item}
                    onEdit={() => onEditTask(item)}
                    onDelete={() => onDeleteTask(item.id)}
                    onManageStories={() => onManageStories(item)}
                    isDragging={snapshot.isDragging}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Empty state */}
            {items.length === 0 && !isAdding && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                  config.bgColor
                )}>
                  <ListTodo size={20} className={cn('opacity-50', config.color)} />
                </div>
                <p className="text-xs text-[rgb(var(--color-text-muted))]">
                  No tasks yet
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className={cn('mt-1 text-xs', config.color)}
                  onClick={() => setIsAdding(true)}
                >
                  Add a task
                </Button>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

/* =================================================================== */
/* Main Kanban Board Component                                         */
/* =================================================================== */
const KanbanBoardView: React.FC = () => {
  const items = useKanbanStore(s => s.items);
  const isLoading = useKanbanStore(s => s.isLoading);
  const isSaving = useKanbanStore(s => s.isSaving);
  
  const { load, create, patch, deleteItem, relocate } = useKanbanService();
  const { loadStories } = useUserStoryService();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<KanbanPriority | null>(null);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [storyAssociationTask, setStoryAssociationTask] = useState<Task | null>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    load();
    loadStories(); // Also load user stories
  }, [load, loadStories]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchTerm
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.details?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        : true;
      const matchesPriority = filterPriority ? item.priority === filterPriority : true;
      return matchesSearch && matchesPriority;
    });
  }, [items, searchTerm, filterPriority]);

  // Group items by status
  const columns = useMemo(() => {
    return KanbanStatusValues.map((status) => ({
      status,
      items: filteredItems.filter((item) => item.status === status),
    }));
  }, [filteredItems]);

  // Handlers
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      const itemId = Number(draggableId);
      const newStatus = destination.droppableId as KanbanStatus;

      // Optimistic update
      relocate(itemId, newStatus, destination.index);

      // Persist status change
      if (source.droppableId !== destination.droppableId) {
        await patch({ id: itemId, status: newStatus });
      }
    },
    [patch, relocate]
  );

  const handleAddTask = useCallback(
    async (status: KanbanStatus, title: string) => {
      await create({ title, status, priority: 'medium' });
    },
    [create]
  );

  const handleEditTask = useCallback((item: Task) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    async (id: number, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      await patch({ id, ...data });
      setIsEditModalOpen(false);
      setEditingItem(null);
    },
    [patch]
  );

  const handleDeleteTask = useCallback(
    async (id: number) => {
      if (confirm('Are you sure you want to delete this task?')) {
        await deleteItem(id);
      }
    },
    [deleteItem]
  );

  const handleManageStories = useCallback((task: Task) => {
    setStoryAssociationTask(task);
    setIsStoryModalOpen(true);
  }, []);

  // Loading state
  if (isLoading && !items.length) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--color-primary))] mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--color-text-muted))]">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] flex items-center gap-2">
              <Sparkles size={18} className="text-[rgb(var(--color-primary))]" />
              Tasks Board
            </h2>
            <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
              Organize and track your project tasks
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-9 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)] focus:border-[rgba(var(--color-primary),0.5)]"
            />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-9 w-9',
                    filterPriority && 'bg-[rgba(var(--color-primary),0.1)] border-[rgba(var(--color-primary),0.3)]'
                  )}
                >
                  <Filter size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="text-xs font-medium mb-2">Filter by priority</p>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={filterPriority === key ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start h-7 text-xs"
                      onClick={() => setFilterPriority(filterPriority === key ? null : key as KanbanPriority)}
                    >
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Button>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Active filters */}
        {(searchTerm || filterPriority) && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[rgb(var(--color-text-muted))]">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Search: "{searchTerm}"
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-3 w-3 ml-1"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={10} />
                </Button>
              </Badge>
            )}
            {filterPriority && (
              <Badge variant="secondary" className="text-xs">
                Priority: {PRIORITY_CONFIG[filterPriority].label}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-3 w-3 ml-1"
                  onClick={() => setFilterPriority(null)}
                >
                  <X size={10} />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {columns.map(({ status, items }) => (
              <Card
                key={status}
                className="overflow-hidden bg-[rgba(var(--color-bg-tertiary),0.3)] border-[rgba(var(--color-border),0.4)] flex flex-col"
              >
                <Column
                  status={status}
                  items={items}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onManageStories={handleManageStories}
                  isSaving={isSaving}
                />
              </Card>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Edit modal */}
      <KanbanEditModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEdit}
        isSaving={isSaving}
      />
      {/* Story association modal */}
      <TaskStoryAssociationModal
        task={storyAssociationTask}
        isOpen={isStoryModalOpen}
        onClose={() => {
          setIsStoryModalOpen(false);
          setStoryAssociationTask(null);
          load(); // Reload tasks after managing associations to reflect changes
          loadStories(); // Reload stories as well
        }}
      />
    </div>
  );
};

export default KanbanBoardView;