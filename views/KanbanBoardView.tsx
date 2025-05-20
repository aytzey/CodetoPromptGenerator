// FILE: views/KanbanBoardView.tsx
// ---------------------------------------------------------------------
// Enhanced Kanban Board with modern visual design, improved animations
// and better user experience - optimized for performance
// ---------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  KanbanItem,
  KanbanPriority,
  KanbanStatus,
  KanbanStatusValues,
} from '@/types';
import { useKanbanStore } from '@/stores/useKanbanStore';
import { useKanbanService } from '@/services/kanbanServiceHooks';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Plus,
  Copy,
  Calendar,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  ListTodo,
  LayoutDashboard,
  X,
  PanelRight,
  PanelRightClose,
  GripHorizontal,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Sun,
  Zap,
  SortDesc,
} from 'lucide-react';

import KanbanEditModal from './KanbanEditModal';

/* =================================================================== */
/* Helper utilities                                                    */
/* =================================================================== */
const COLUMN_NAME: Record<KanbanStatus, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

const COLUMN_ICON: Record<KanbanStatus, React.ReactNode> = {
  todo: <ListTodo size={16} className="text-blue-400" />,
  'in-progress': <Clock size={16} className="text-amber-400" />,
  done: <CheckCircle2 size={16} className="text-emerald-400" />,
};

const PRIORITY_CONFIG = {
  low: {
    className: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40',
    label: 'Low',
    icon: <Sun size={10} className="mr-1" />
  },
  medium: {
    className: 'bg-amber-600/20 text-amber-400 border border-amber-500/40',
    label: 'Medium',
    icon: <Zap size={10} className="mr-1" />
  },
  high: {
    className: 'bg-rose-600/20 text-rose-400 border border-rose-500/40',
    label: 'High',
    icon: <AlertTriangle size={10} className="mr-1" />
  },
} as const;

const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/* ------------- visual helpers -------------------------------------- */
// Memoized priority badge component to prevent unnecessary re-renders
const PriorityBadge = React.memo<{ p: KanbanPriority }>(({ p }) => {
  const config = PRIORITY_CONFIG[p];
  
  return (
    <Badge
      className={cn(
        'px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider transition-all',
        config.className
      )}
      variant="outline"
    >
      {config.icon}
      {config.label}
    </Badge>
  );
});
PriorityBadge.displayName = 'PriorityBadge';

// Memoized deadline component to prevent unnecessary re-renders
const Deadline = React.memo<{ d?: string | null }>(({ d }) => {
  if (!d) return null;
  try {
    const dt = parseISO(d);
    const isOverdue = isPast(dt) && !isToday(dt);
    const formattedDate = isToday(dt)
      ? 'Today'
      : isOverdue
      ? `${format(dt, 'MMM d')} (Overdue)`
      : format(dt, 'MMM d');
      
    return (
      <div 
        className={cn(
          'flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5 transition-all',
          isOverdue 
            ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40' 
            : isToday(dt)
            ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40'
            : 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
        )}
      >
        <Calendar size={10} />
        <span>{formattedDate}</span>
      </div>
    );
  } catch (err) {
    console.warn('Invalid date for deadline:', d, err);
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-600/20 border border-rose-500/40 rounded-full px-2 py-0.5">
        <AlertTriangle size={10} />
        <span>Invalid Date</span>
      </div>
    );
  }
});
Deadline.displayName = 'Deadline';

/* =================================================================== */
/* Column Header Component                                             */
/* =================================================================== */
interface ColumnHeaderProps {
  status: KanbanStatus;
  count: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ColumnHeader = React.memo<ColumnHeaderProps>(({ status, count, isCollapsed, onToggleCollapse }) => (
  <CardHeader className="glass-header py-4 px-5 border-b border-[rgba(var(--color-border),0.5)] sticky top-0 z-10 rounded-t-xl">
    <CardTitle className="text-base flex items-center gap-2 text-[rgb(var(--color-text-primary))]">
      {COLUMN_ICON[status]}
      <span className="ml-1 text-gradient-primary font-semibold">{COLUMN_NAME[status]}</span>
      <div className="ml-auto bg-[rgba(var(--color-surface),0.7)] px-2.5 py-1 rounded-full text-xs text-[rgb(var(--color-text-muted))] font-medium border border-[rgba(var(--color-border),0.6)]">
        {count}
      </div>
      
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full ml-1 text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgba(var(--color-surface),0.7)]"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand column" : "Collapse column"}
        >
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </Button>
      )}
    </CardTitle>
  </CardHeader>
));
ColumnHeader.displayName = 'ColumnHeader';

/* =================================================================== */
/* Empty Column State Component                                        */
/* =================================================================== */
interface EmptyColumnProps {
  status: KanbanStatus;
}

const EmptyColumn = React.memo<EmptyColumnProps>(({ status }) => (
  <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center animate-fade-in">
    <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-bg-secondary),0.5)] flex items-center justify-center">
      <Plus size={24} className="text-[rgb(var(--color-text-muted))] opacity-50" />
    </div>
    <p className="text-sm text-[rgb(var(--color-text-muted))] max-w-[80%]">
      No tasks in {COLUMN_NAME[status]}. Add a new task or drag one here.
    </p>
  </div>
));
EmptyColumn.displayName = 'EmptyColumn';

/* =================================================================== */
/* Quick Add Input Component                                           */
/* =================================================================== */
interface QuickAddInputProps {
  status: KanbanStatus;
  value: string;
  onChange: (status: KanbanStatus, value: string) => void;
  onAdd: (status: KanbanStatus) => void;
  isSaving: boolean;
}

const QuickAddInput = React.memo<QuickAddInputProps>(
  ({ status, value, onChange, onAdd, isSaving }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onAdd(status);
        // Focus back on input after adding
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    
    return (
      <div className="p-3 border-t border-[rgba(var(--color-border),0.5)] mt-auto bg-[rgba(var(--color-bg-tertiary),0.4)] backdrop-blur-sm rounded-b-xl">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            aria-label={`Add card in ${COLUMN_NAME[status]}`}
            className="h-10 text-sm bg-[rgba(var(--color-bg-primary),0.6)] border-[rgba(var(--color-border),0.6)] rounded-lg focus-glow"
            placeholder={`Add task to ${COLUMN_NAME[status].toLowerCase()}...`}
            value={value}
            onChange={(e) => onChange(status, e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
          />
          <Button
            size="icon"
            className={cn(
              "h-10 w-10 flex-shrink-0 rounded-lg shadow transition-all duration-200 active-scale",
              value.trim() 
                ? "bg-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.85)] text-white" 
                : "bg-[rgba(var(--color-surface),0.5)] text-[rgb(var(--color-text-muted))]"
            )}
            onClick={() => onAdd(status)}
            disabled={isSaving || !value.trim()}
            aria-label={`Add to ${COLUMN_NAME[status]}`}
          >
            <Plus size={20} />
          </Button>
        </div>
      </div>
    );
  }
);
QuickAddInput.displayName = 'QuickAddInput';

/* =================================================================== */
/* Search Component                                                    */
/* =================================================================== */
interface SearchBarProps {
  search: string;
  onSearch: (value: string) => void;
  filterPriority: KanbanPriority | null;
  onFilterPriority: (priority: KanbanPriority | null) => void;
}

const SearchBar = React.memo<SearchBarProps>(
  ({ search, onSearch, filterPriority, onFilterPriority }) => {
    return (
      <div className="flex gap-2 items-center mb-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--color-text-muted))]" size={16} />
          <Input
            className="pl-9 pr-4 h-10 bg-[rgba(var(--color-bg-secondary),0.6)] border-[rgba(var(--color-border),0.6)] rounded-lg focus-glow"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-[rgb(var(--color-text-muted))]"
              onClick={() => onSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-lg border-[rgba(var(--color-border),0.6)]",
                    filterPriority && "bg-[rgba(var(--color-primary),0.15)] border-[rgba(var(--color-primary),0.5)]"
                  )}
                  aria-label="Filter by priority"
                >
                  <Filter size={16} />
                </Button>
                {filterPriority && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className={cn(
                      "h-5 w-5 p-0 flex items-center justify-center rounded-full",
                      PRIORITY_CONFIG[filterPriority].className
                    )}>
                      <X size={10} onClick={() => onFilterPriority(null)} />
                    </Badge>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="glass p-2">
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium pb-1.5 text-[rgb(var(--color-text-muted))]">Filter by priority:</p>
                <div className="flex gap-2">
                  {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
                    <Button
                      key={priority}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "text-xs h-7 px-2 rounded-sm border",
                        config.className,
                        filterPriority === priority && "ring-2 ring-[rgba(var(--color-primary),0.5)]"
                      )}
                      onClick={() => onFilterPriority(priority as KanbanPriority)}
                    >
                      {config.icon}
                      {config.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => onFilterPriority(null)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-lg border-[rgba(var(--color-border),0.6)]"
                aria-label="Sort tasks"
              >
                <SortDesc size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="glass">
              <p>Sort functionality (coming soon)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
);
SearchBar.displayName = 'SearchBar';

/* =================================================================== */
/* Confirmation Dialog Component                                       */
/* =================================================================== */
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, message
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-sm rounded-xl p-6 shadow-xl animate-slide-up">
        <h3 className="text-lg font-semibold mb-2 text-[rgb(var(--color-text-primary))]">{title}</h3>
        <p className="text-[rgb(var(--color-text-muted))] mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-[rgba(var(--color-border),0.7)] hover:bg-[rgba(var(--color-border),0.15)]"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error),0.9)]"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =================================================================== */
/* Kanban Board                                                        */
/* =================================================================== */
const KanbanBoardView: React.FC = () => {
  const { items, isLoading, isSaving } = useKanbanStore();
  const { load, create, patch, deleteItem, relocate } = useKanbanService();

  /* ---------------- first load ---------------- */
  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- local UI state ------------ */
  const [draft, setDraft] = useState<Record<KanbanStatus, string>>({
    todo: '',
    'in-progress': '',
    done: '',
  });
  const [editingItem, setEditingItem] = useState<KanbanItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDragColumn, setActiveDragColumn] = useState<KanbanStatus | null>(null);
  const [compactView, setCompactView] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<KanbanPriority | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<KanbanStatus, boolean>>({
    todo: false,
    'in-progress': false,
    done: false,
  });
  
  /* ---------------- animation refs ------------- */
  const lastDragEnd = useRef<number>(0);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- filtered items ------------- */
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Apply search filter
      const matchesSearch = searchTerm 
        ? item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (item.details?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        : true;
      
      // Apply priority filter
      const matchesPriority = filterPriority ? item.priority === filterPriority : true;
      
      return matchesSearch && matchesPriority;
    });
  }, [items, searchTerm, filterPriority]);

  /* ---------------- memo columns ------------- */
  const columns = useMemo(
    () =>
      KanbanStatusValues.map((s) => ({
        id: s,
        status: s,
        items: filteredItems.filter((i) => i.status === s),
      })),
    [filteredItems]
  );
  
  /* ---------------- drag‑and‑drop ------------- */
  const onDragStart = useCallback((result: any) => {
    setActiveDragColumn(result.source.droppableId as KanbanStatus);
    setDraggedItemId(result.draggableId);
    
    // Clear any existing animation timeouts
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    
    // Add a class to the body during drag to disable text selection globally
    document.body.classList.add('dragging-active');
    
    // Apply hardware acceleration to make drag smooth
    const draggableEle = document.getElementById(`kanban-card-${result.draggableId}`);
    if (draggableEle) {
      draggableEle.classList.add('hardware-accelerated');
    }
  }, []);
  
  const onDragEnd = useCallback(async (result: DropResult) => {
    // Reset drag state
    setActiveDragColumn(null);
    setDraggedItemId(null);
    document.body.classList.remove('dragging-active');
    
    const { destination, source, draggableId } = result;
    if (!destination) return; // dropped outside list

    const fromStatus = source.droppableId as KanbanStatus;
    const toStatus = destination.droppableId as KanbanStatus;
    const toIndex = destination.index;
    
    // If dropped in same position, don't do anything
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    // Prevent double animations when dragging quickly
    const now = Date.now();
    const isRapidDrag = now - lastDragEnd.current < 300;
    lastDragEnd.current = now;

    // Optimistic client update – reflects immediately
    relocate(Number(draggableId), toStatus, toIndex);

    // Persist **status** change only (order is local)
    if (fromStatus !== toStatus) {
      const isStatusChange = fromStatus !== toStatus;
      
      // Add visual feedback when changing column
      if (isStatusChange && !isRapidDrag) {
        const cardElement = document.getElementById(`kanban-card-${draggableId}`);
        if (cardElement) {
          // Remove hardware acceleration class
          cardElement.classList.remove('hardware-accelerated');
          
          // Add a highlight animation class with a slight delay
          setTimeout(() => {
            cardElement.classList.add('kanban-card-highlight');
            
            // Remove class after animation completes
            animationTimeoutRef.current = setTimeout(() => {
              cardElement.classList.remove('kanban-card-highlight');
            }, 900);
          }, 50);
        }
      }
      
      await patch({ id: Number(draggableId), status: toStatus });
    }
  }, [patch, relocate]);

  // Handle drag cancel
  const onDragUpdate = useCallback((result: any) => {
    // This helps provide visual feedback during dragging
    if (!result.destination) {
      // Visual indication that dropping outside is not allowed
      const draggableEle = document.getElementById(`kanban-card-${result.draggableId}`);
      if (draggableEle) {
        draggableEle.classList.add('drop-not-allowed');
      }
    } else {
      const draggableEle = document.getElementById(`kanban-card-${result.draggableId}`);
      if (draggableEle) {
        draggableEle.classList.remove('drop-not-allowed');
      }
    }
  }, []);

  /* ---------------- helpers ------------------ */
  const addDraft = useCallback(async (s: KanbanStatus) => {
    const t = draft[s].trim();
    if (!t) return;
    const newItem = await create({ title: t, status: s, priority: 'medium' });
    if (newItem) setDraft((d) => ({ ...d, [s]: '' }));
  }, [create, draft]);

  const handleDraftChange = useCallback((s: KanbanStatus, value: string) => {
    setDraft((d) => ({ ...d, [s]: value }));
  }, []);

  const openEdit = useCallback((it: KanbanItem) => {
    setEditingItem(it);
    setIsEditModalOpen(true);
  }, []);
  
  const closeEdit = useCallback(() => {
    setEditingItem(null);
    setIsEditModalOpen(false);
  }, []);
  
  const saveEdit = useCallback(async (
    id: number,
    data: Partial<Omit<KanbanItem, 'id' | 'createdAt'>>
  ) => {
    await patch({ id, ...data });
    closeEdit();
  }, [closeEdit, patch]);
  
  const confirmDelete = useCallback((id: number) => {
    setDeleteConfirm({ open: true, id });
  }, []);
  
  const cancelDelete = useCallback(() => {
    setDeleteConfirm({ open: false, id: null });
  }, []);
  
  const executeDelete = useCallback(async () => {
    if (deleteConfirm.id !== null) {
      await deleteItem(deleteConfirm.id);
    }
    setDeleteConfirm({ open: false, id: null });
  }, [deleteConfirm.id, deleteItem]);
  
  const toggleColumnCollapse = useCallback((status: KanbanStatus) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  }, []);

  /* ---------------- keyboard navigation handlers ------------- */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, item: KanbanItem) => {
    // Edit card with Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      openEdit(item);
    }
    // Delete card with Delete/Backspace
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('input, textarea')) {
      e.preventDefault();
      confirmDelete(item.id);
    }
  }, [confirmDelete, openEdit]);

  /* ---------------- render ------------------- */
  if (isLoading && !items.length)
    return (
      <div className="flex justify-center items-center h-64 animate-pulse-subtle animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--color-primary))]" />
            <div className="absolute inset-0 animate-ping opacity-50 rounded-full bg-[rgba(var(--color-primary),0.3)]"></div>
          </div>
          <p className="text-lg text-[rgb(var(--color-text-muted))] font-medium">Loading Kanban Board...</p>
        </div>
      </div>
    );

  return (
    <>
      {/* Header with controls */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gradient-primary flex items-center gap-2">
              <LayoutDashboard size={20} />
              Kanban Board
            </h2>
            <Badge variant="outline" className="bg-[rgba(var(--color-primary),0.1)] border-[rgba(var(--color-primary),0.3)]">
              {items.length} Tasks
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 bg-[rgba(var(--color-bg-tertiary),0.6)] border-[rgba(var(--color-border),0.6)]",
                      compactView && "bg-[rgba(var(--color-primary),0.15)] border-[rgba(var(--color-primary),0.4)]"
                    )}
                    onClick={() => setCompactView(!compactView)}
                  >
                    {compactView ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
                    <span className="ml-2">{compactView ? 'Compact' : 'Default'} View</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass">
                  <p>Toggle between compact and default card view</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Search and filters */}
        <SearchBar 
          search={searchTerm}
          onSearch={setSearchTerm}
          filterPriority={filterPriority}
          onFilterPriority={setFilterPriority}
        />
        
        {/* Active filters indicator */}
        {(searchTerm || filterPriority) && (
          <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-muted))]">
            <span>Active filters:</span>
            {searchTerm && (
              <Badge variant="outline" className="bg-[rgba(var(--color-primary),0.1)] border-[rgba(var(--color-primary),0.3)] gap-1 pl-2">
                "{searchTerm}"
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 ml-1 text-[rgb(var(--color-text-muted))]" 
                  onClick={() => setSearchTerm('')}
                >
                  <X size={10} />
                </Button>
              </Badge>
            )}
            {filterPriority && (
              <Badge variant="outline" className={cn(
                "gap-1 pl-2",
                PRIORITY_CONFIG[filterPriority].className
              )}>
                {PRIORITY_CONFIG[filterPriority].label} Priority
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 ml-1" 
                  onClick={() => setFilterPriority(null)}
                >
                  <X size={10} />
                </Button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-6 hover:bg-[rgba(var(--color-bg-tertiary),0.6)]" 
              onClick={() => {
                setSearchTerm('');
                setFilterPriority(null);
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* If filtered items is empty, show message */}
      {filteredItems.length === 0 && items.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center bg-[rgba(var(--color-bg-secondary),0.3)] rounded-xl border border-[rgba(var(--color-border),0.5)] animate-fade-in">
          <Search size={40} className="text-[rgb(var(--color-text-muted))] opacity-50" />
          <div>
            <p className="text-lg font-medium text-[rgb(var(--color-text-primary))]">No matching tasks found</p>
            <p className="text-sm text-[rgb(var(--color-text-muted))] max-w-md mt-2">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={() => {
              setSearchTerm('');
              setFilterPriority(null);
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Only render board if there are items to show or no filters are applied */}
      {(filteredItems.length > 0 || items.length === 0) && (
        <DragDropContext 
          onDragStart={onDragStart} 
          onDragEnd={onDragEnd} 
          onDragUpdate={onDragUpdate}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 will-change-transform">
            {columns.map(({ status, items: columnItems }) => (
              <Droppable droppableId={status} key={status} isDropDisabled={collapsedColumns[status]}>
                {(prov, snap) => (
                  <Card
                    ref={prov.innerRef}
                    {...prov.droppableProps}
                    className={cn(
                      'glass flex flex-col min-h-[200px] shadow-lg rounded-xl transition-all duration-300',
                      collapsedColumns[status] ? 'min-h-[100px] max-h-[100px]' : 'min-h-[500px]',
                      snap.isDraggingOver && 'ring-2 ring-[rgba(var(--color-primary),0.5)] scale-[1.01] shadow-xl',
                      activeDragColumn === status && !snap.isDraggingOver && 'opacity-95',
                      activeDragColumn && activeDragColumn !== status && !snap.isDraggingOver && 'opacity-80',
                      snap.isDraggingOver && 'kanban-column-highlight'
                    )}
                  >
                    <ColumnHeader 
                      status={status} 
                      count={columnItems.length} 
                      isCollapsed={collapsedColumns[status]}
                      onToggleCollapse={() => toggleColumnCollapse(status)}
                    />

                    {/* Only show content if column is not collapsed */}
                    {!collapsedColumns[status] && (
                      <>
                        <CardContent className="flex-1 p-3 space-y-3 overflow-hidden">
                          <ScrollArea className="h-[calc(28rem-40px)] pr-2">
                            <div 
                              className={cn(
                                "space-y-3 min-h-[50px]",
                                snap.isDraggingOver && "pb-10" // Extra space when dragging for visual clarity
                              )}
                            >
                              {columnItems.map((item, idx) => (
                                <Draggable draggableId={item.id.toString()} index={idx} key={item.id}>
                                  {(dragProv, dragSnap) => (
                                    <KanbanCard
                                      ref={dragProv.innerRef}
                                      {...dragProv.draggableProps}
                                      dragHandleProps={dragProv.dragHandleProps}
                                      item={item}
                                      isDragging={dragSnap.isDragging}
                                      onEdit={() => openEdit(item)}
                                      onDelete={() => confirmDelete(item.id)}
                                      onKeyDown={(e) => handleKeyDown(e, item)}
                                      compactView={compactView}
                                      isBeingDragged={draggedItemId === item.id.toString()}
                                    />
                                  )}
                                </Draggable>
                              ))}
                              {prov.placeholder}
                              {columnItems.length === 0 && <EmptyColumn status={status} />}
                            </div>
                          </ScrollArea>
                        </CardContent>

                        {/* Quick "add card" bar */}
                        <QuickAddInput
                          status={status}
                          value={draft[status]}
                          onChange={handleDraftChange}
                          onAdd={addDraft}
                          isSaving={isSaving}
                        />
                      </>
                    )}
                  </Card>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Edit modal */}
      <KanbanEditModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={closeEdit}
        onSave={saveEdit}
        isSaving={isSaving}
      />
      
      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={cancelDelete}
        onConfirm={executeDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </>
  );
};

/* =================================================================== */
/* Card component – forwarded ref so Draggable can attach              */
/* =================================================================== */
interface CardProps {
  item: KanbanItem;
  onEdit: () => void;
  onDelete: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isDragging: boolean;
  compactView: boolean;
  isBeingDragged: boolean;
  dragHandleProps: any;
}

const KanbanCard = React.memo(
  React.forwardRef<HTMLDivElement, CardProps>(
    ({ item, onEdit, onDelete, onKeyDown, isDragging, compactView, isBeingDragged, dragHandleProps, ...rest }, ref) => {
      const [isHovering, setIsHovering] = useState(false);
      
      // Enhanced drag handle with dedicated grip icon for better usability
      const DragHandle = () => (
        <div 
          {...dragHandleProps}
          className={cn(
            "absolute top-0 left-0 w-full h-full cursor-grab active:cursor-grabbing",
            "touch-manipulation select-none"
          )}
          aria-label="Drag handle"
        >
          <div className={cn(
            "absolute top-2 right-2 w-6 h-6 flex items-center justify-center",
            "rounded-full opacity-0 transition-opacity duration-200 bg-[rgba(var(--color-bg-tertiary),0.8)]",
            "border border-[rgba(var(--color-border),0.5)]",
            (isHovering || isDragging) && "opacity-80"
          )}>
            <GripHorizontal size={14} className="text-[rgb(var(--color-text-muted))]" />
          </div>
        </div>
      );
      
      return (
        <div
          id={`kanban-card-${item.id}`}
          ref={ref}
          {...rest}
          className={cn(
            'p-4 rounded-lg bg-[rgba(var(--color-surface),0.8)] border border-[rgba(var(--color-border),0.5)] relative group transition-all',
            compactView ? 'py-3' : 'space-y-3',
            isDragging && [
              'shadow-xl ring-2 ring-[rgba(var(--color-primary),0.4)] z-20 smooth-drag will-change-transform',
              'bg-[rgba(var(--color-bg-tertiary),0.95)] backdrop-blur-lg scale-[1.02]'
            ],
            !isDragging && 'hover:shadow-md hover:-translate-y-0.5 hover:border-[rgba(var(--color-border-highlight),0.7)] transition-transform duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary),0.4)] focus:border-[rgb(var(--color-primary))]',
            isBeingDragged && 'touch-none'
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label={`Task: ${item.title}`}
        >
          {/* Priority indicator bar at top of card */}
          <div 
            className={cn(
              "absolute top-0 left-0 right-0 h-1 rounded-t-lg",
              item.priority === 'high' && "bg-rose-500/50",
              item.priority === 'medium' && "bg-amber-500/50",
              item.priority === 'low' && "bg-emerald-500/50",
            )}
          />
          
          {/* Dedicated drag handle component that wraps the card content */}
          <DragHandle />
          
          {/* Action buttons - shown on hover */}
          <div 
            className={cn(
              "absolute -top-2 -right-2 flex gap-1 opacity-0 transform translate-y-2 transition-all duration-200 z-30",
              (isHovering || isDragging) && "opacity-100 translate-y-0"
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-[rgba(var(--color-bg-tertiary),0.95)] border border-[rgba(var(--color-border),0.4)] shadow-md text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))] hover:text-white active-scale"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    aria-label="Edit task"
                  >
                    <Edit2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="glass">
                  <p>Edit Task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-[rgba(var(--color-bg-tertiary),0.95)] border border-[rgba(var(--color-border),0.4)] shadow-md text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error))] hover:text-white active-scale"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    aria-label="Delete task"
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="glass">
                  <p>Delete Task</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {compactView ? (
            // Compact view layout
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm break-words text-[rgb(var(--color-text-primary))] truncate">
                  {item.title}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <PriorityBadge p={item.priority} />
                {item.dueDate && <Deadline d={item.dueDate} />}
              </div>
            </div>
          ) : (
            // Regular view layout
            <>
              {/* Card Title */}
              <div className="pt-2.5">
                <h4 className="font-medium text-sm break-words text-[rgb(var(--color-text-primary))]">
                  {item.title}
                </h4>
              </div>

              {/* Card Details */}
              {item.details && (
                <div className="px-2.5 py-2 bg-[rgba(var(--color-bg-secondary),0.5)] rounded-md border border-[rgba(var(--color-border),0.3)]">
                  <p className="text-xs text-[rgb(var(--color-text-muted))] break-words line-clamp-3">
                    {item.details}
                  </p>
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-1">
                <PriorityBadge p={item.priority} />
                
                <div className="flex items-center gap-2">
                  <Deadline d={item.dueDate} />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          aria-label="Copy branch name"
                          className="text-[rgb(var(--color-text-muted),0.6)] hover:text-[rgb(var(--color-text-primary))] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(slugify(item.title));
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="glass">
                        <p>Copy git-friendly name</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }
  )
);
KanbanCard.displayName = 'KanbanCard';

export default KanbanBoardView;