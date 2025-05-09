// FILE: views/KanbanBoardView.tsx
// ---------------------------------------------------------------------
// Enhanced Kanban Board with modern visual design, improved animations
// and better user experience
// ---------------------------------------------------------------------
import React, { useEffect, useMemo, useState } from 'react';
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

const slugify = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/* ------------- visual helpers -------------------------------------- */
const PriorityBadge: React.FC<{ p: KanbanPriority }> = ({ p }) => {
  const config = {
    low: {
      className: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40',
      label: 'Low'
    },
    medium: {
      className: 'bg-amber-600/20 text-amber-400 border border-amber-500/40',
      label: 'Medium'
    },
    high: {
      className: 'bg-rose-600/20 text-rose-400 border border-rose-500/40',
      label: 'High'
    },
  } as const;
  
  return (
    <Badge
      className={cn(
        'px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider transition-all',
        config[p].className
      )}
      variant="outline"
    >
      {config[p].label}
    </Badge>
  );
};

const Deadline: React.FC<{ d?: string | null }> = ({ d }) => {
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

  /* ---------------- memo columns ------------- */
  const columns = useMemo(
    () =>
      KanbanStatusValues.map((s) => ({
        id: s,
        status: s,
        items: items.filter((i) => i.status === s),
      })),
    [items]
  );

  /* ---------------- drag‑and‑drop ------------- */
  const onDragStart = (result: any) => {
    setActiveDragColumn(result.source.droppableId as KanbanStatus);
  };
  
  const onDragEnd = async (result: DropResult) => {
    setActiveDragColumn(null);
    const { destination, source, draggableId } = result;
    if (!destination) return; // dropped outside list

    const fromStatus = source.droppableId as KanbanStatus;
    const toStatus = destination.droppableId as KanbanStatus;
    const toIndex = destination.index;

    // Optimistic client update – reflects immediately
    relocate(Number(draggableId), toStatus, toIndex);

    // Persist **status** change only (order is local)
    if (fromStatus !== toStatus) {
      await patch({ id: Number(draggableId), status: toStatus });
    }
  };

  /* ---------------- helpers ------------------ */
  const addDraft = async (s: KanbanStatus) => {
    const t = draft[s].trim();
    if (!t) return;
    const newItem = await create({ title: t, status: s, priority: 'medium' });
    if (newItem) setDraft((d) => ({ ...d, [s]: '' }));
  };

  const openEdit = (it: KanbanItem) => {
    setEditingItem(it);
    setIsEditModalOpen(true);
  };
  
  const closeEdit = () => {
    setEditingItem(null);
    setIsEditModalOpen(false);
  };
  
  const saveEdit = async (
    id: number,
    data: Partial<Omit<KanbanItem, 'id' | 'createdAt'>>
  ) => {
    await patch({ id, ...data });
    closeEdit();
  };
  
  const removeItem = async (id: number) => {
    if (window.confirm('Delete this card?')) await deleteItem(id);
  };

  /* ---------------- render ------------------- */
  if (isLoading && !items.length)
    return (
      <div className="flex justify-center items-center h-64 animate-pulse-subtle">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[rgb(var(--color-primary))]" />
          <p className="text-lg text-[rgb(var(--color-text-muted))] font-medium">Loading Kanban Board...</p>
        </div>
      </div>
    );

  return (
    <>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(({ id, status, items: columnItems }) => (
            <Droppable droppableId={status} key={status}>
              {(prov, snap) => (
                <Card
                  ref={prov.innerRef}
                  {...prov.droppableProps}
                  className={cn(
                    'glass flex flex-col min-h-[500px] shadow-lg rounded-xl transition-all duration-300',
                    snap.isDraggingOver && 'ring-2 ring-[rgba(var(--color-primary),0.5)] scale-[1.01] shadow-xl',
                    activeDragColumn === status && !snap.isDraggingOver && 'opacity-95',
                    activeDragColumn && activeDragColumn !== status && !snap.isDraggingOver && 'opacity-80'
                  )}
                >
                  <CardHeader className="glass-header py-4 px-5 border-b border-[rgba(var(--color-border),0.5)] sticky top-0 z-10 rounded-t-xl">
                    <CardTitle className="text-base flex items-center gap-2 text-[rgb(var(--color-text-primary))]">
                      {COLUMN_ICON[status]}
                      <span className="ml-1 text-gradient-primary font-semibold">{COLUMN_NAME[status]}</span>
                      <div className="ml-auto bg-[rgba(var(--color-surface),0.7)] px-2.5 py-1 rounded-full text-xs text-[rgb(var(--color-text-muted))] font-medium border border-[rgba(var(--color-border),0.6)]">
                        {columnItems.length}
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex-1 p-3 space-y-3 overflow-hidden">
                    <ScrollArea className="h-[calc(28rem-40px)] pr-2">
                      <div className="space-y-3 min-h-[50px]">
                        {columnItems.map((item, idx) => (
                          <Draggable draggableId={item.id.toString()} index={idx} key={item.id}>
                            {(dragProv, dragSnap) => (
                              <KanbanCard
                                ref={dragProv.innerRef}
                                {...dragProv.draggableProps}
                                {...dragProv.dragHandleProps}
                                item={item}
                                isDragging={dragSnap.isDragging}
                                onEdit={() => openEdit(item)}
                                onDelete={() => removeItem(item.id)}
                              />
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                        {columnItems.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center">
                            <div className="w-16 h-16 rounded-full bg-[rgba(var(--color-bg-secondary),0.5)] flex items-center justify-center">
                              <Plus size={24} className="text-[rgb(var(--color-text-muted))] opacity-50" />
                            </div>
                            <p className="text-sm text-[rgb(var(--color-text-muted))] max-w-[80%]">
                              No tasks yet. Add a new task or drag one here.
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  {/* ----- quick "add card" bar ----- */}
                  <div className="p-3 border-t border-[rgba(var(--color-border),0.5)] mt-auto bg-[rgba(var(--color-bg-tertiary),0.4)] backdrop-blur-sm rounded-b-xl">
                    <div className="flex gap-2">
                      <Input
                        aria-label={`Add card in ${COLUMN_NAME[status]}`}
                        className="h-10 text-sm bg-[rgba(var(--color-bg-primary),0.6)] border-[rgba(var(--color-border),0.6)] rounded-lg focus-glow"
                        placeholder={`Add task to ${COLUMN_NAME[status].toLowerCase()}...`}
                        value={draft[status]}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [status]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && addDraft(status)}
                        disabled={isSaving}
                      />
                      <Button
                        size="icon"
                        className={cn(
                          "h-10 w-10 flex-shrink-0 rounded-lg shadow transition-all duration-200 active-scale",
                          draft[status].trim() ? "bg-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.85)] text-white" : 
                          "bg-[rgba(var(--color-surface),0.5)] text-[rgb(var(--color-text-muted))]"
                        )}
                        onClick={() => addDraft(status)}
                        disabled={isSaving || !draft[status].trim()}
                      >
                        <Plus size={20} />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* ---------------- edit modal ---------------- */}
      <KanbanEditModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={closeEdit}
        onSave={saveEdit}
        isSaving={isSaving}
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
  isDragging: boolean;
}

const KanbanCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ item, onEdit, onDelete, isDragging, ...dragProps }, ref) => {
    const [isHovering, setIsHovering] = useState(false);
    
    return (
      <div
        ref={ref}
        {...dragProps}
        className={cn(
          'p-4 rounded-lg bg-[rgba(var(--color-surface),0.8)] border border-[rgba(var(--color-border),0.5)] select-none space-y-3 group relative transition-all duration-200',
          isDragging && 'shadow-xl ring-2 ring-[rgba(var(--color-primary),0.4)] rotate-1 scale-105',
          !isDragging && 'hover:shadow-md hover:-translate-y-0.5 hover:border-[rgba(var(--color-border-highlight),0.7)]'
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
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
        
        {/* Action buttons - shown on hover */}
        <div 
          className={cn(
            "absolute -top-2 -right-2 flex gap-1 opacity-0 transform translate-y-2 transition-all duration-200",
            (isHovering || isDragging) && "opacity-100 translate-y-0"
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-[rgba(var(--color-bg-tertiary),0.95)] border border-[rgba(var(--color-border),0.4)] shadow-md text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
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
                  className="h-8 w-8 rounded-full bg-[rgba(var(--color-bg-tertiary),0.95)] border border-[rgba(var(--color-border),0.4)] shadow-md text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error))] hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
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
      </div>
    );
  }
);
KanbanCard.displayName = 'KanbanCard';

export default KanbanBoardView;