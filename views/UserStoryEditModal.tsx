// FILE: views/UserStoryEditModal.tsx
// views/UserStoryEditModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; 
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  KanbanPriority,
  KanbanPriorityValues,
  UserStory,
  KanbanStatus,
  KanbanStatusValues,
} from '@/types';
import {
  Loader2,
  AlertCircle,
  Edit2,
  Flag,
  AlignLeft,
  Check,
  X,
  Hash,
  ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserStoryEditModalProps {
  story: UserStory | null; 
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: number | null, 
    data: Partial<Omit<UserStory, 'id' | 'createdAt' | 'taskIds'>>
  ) => Promise<void>;
  isSaving: boolean;
}

const PRIORITY_CONFIG: Record<KanbanPriority, {
  icon: React.ReactNode;
  label: string;
  className: string;
}> = {
  low: {
    icon: <Flag className="h-4 w-4 text-emerald-500" />,
    label: 'Low Priority',
    className: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 focus:ring-emerald-500/30'
  },
  medium: {
    icon: <Flag className="h-4 w-4 text-amber-500" />,
    label: 'Medium Priority',
    className: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 focus:ring-amber-500/30'
  },
  high: {
    icon: <Flag className="h-4 w-4 text-rose-500" />,
    label: 'High Priority',
    className: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 focus:ring-rose-500/30'
  },
};


const UserStoryEditModal: React.FC<UserStoryEditModalProps> = ({
  story,
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState<KanbanPriority>('medium');
  const [points, setPoints] = useState<number | ''>('');
  const [status, setStatus] = useState<KanbanStatus>('todo');
  const [error, setError] = useState<string | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);

  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setDescription(story.description || '');
      setAcceptanceCriteria(story.acceptanceCriteria || '');
      setPriority(story.priority);
      setPoints(story.points ?? '');
      setStatus(story.status);
      setError(null);
    } else {
      // For new story
      setTitle('');
      setDescription('');
      setAcceptanceCriteria('');
      setPriority('medium');
      setPoints('');
      setStatus('todo');
      setError(null);
    }
  }, [story, isOpen]);

  useEffect(() => {
    if (isOpen && !story) { // Only auto-focus for new stories
      const timer = setTimeout(() => {
        setTitleFocused(true);
      }, 100);
      return () => clearTimeout(timer);
    }
    setTitleFocused(false);
  }, [isOpen, story]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const savedPoints = points === '' ? null : Number(points);
    if (savedPoints !== null && isNaN(savedPoints)) {
      setError('Points must be a valid number');
      return;
    }

    const updatedData: Partial<Omit<UserStory, 'id' | 'createdAt' | 'taskIds'>> = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      acceptanceCriteria: acceptanceCriteria.trim() ? acceptanceCriteria.trim() : null,
      priority,
      points: savedPoints,
      status,
    };

    try {
      await onSave(story?.id || null, updatedData);
    } catch (err) {
      setError('Failed to save changes');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isSaving && title.trim()) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[520px] glass border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-primary))] shadow-xl animate-slide-up"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="pb-3 border-b border-[rgba(var(--color-border),0.5)]">
          <DialogTitle className="text-[rgb(var(--color-primary))] text-xl flex items-center gap-2">
            <Edit2 size={18} className="text-[rgb(var(--color-primary))]" />
            {story ? 'Edit User Story' : 'Create New User Story'}
          </DialogTitle>
          <DialogDescription className="text-[rgb(var(--color-text-muted))]">
            {story ? 'Update the details of this user story' : 'Define a new user story for your project'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center text-rose-500 text-sm animate-fade-in">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-5 py-4">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <AlignLeft size={14} /> Title <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error && e.target.value.trim()) setError(null);
              }}
              className={cn(
                "h-10 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow transition-all",
                error && !title.trim() && "border-rose-500 bg-rose-500/5"
              )}
              placeholder="Enter user story title"
              autoFocus={titleFocused}
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <AlignLeft size={14} /> Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow resize-y"
              placeholder="As a user, I want to..."
            />
          </div>

          {/* Acceptance Criteria Field */}
          <div className="space-y-2">
            <Label htmlFor="acceptanceCriteria" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <ListOrdered size={14} /> Acceptance Criteria
            </Label>
            <Textarea
              id="acceptanceCriteria"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              className="min-h-[80px] bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow resize-y"
              placeholder="GIVEN..., WHEN..., THEN..."
            />
          </div>

          {/* Priority, Points, Status */}
          <div className="grid grid-cols-3 gap-4">
            {/* Priority Field */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
                <Flag size={14} /> Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as KanbanPriority)}>
                <SelectTrigger
                  className={cn(
                    "h-10 focus-glow border-[rgba(var(--color-border),0.7)]",
                    PRIORITY_CONFIG[priority].className
                  )}
                >
                  <SelectValue placeholder="Select priority">
                    <div className="flex items-center gap-2">
                      {PRIORITY_CONFIG[priority].icon}
                      <span className="capitalize">{priority}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
                  {KanbanPriorityValues.map(p => (
                    <SelectItem
                      key={p}
                      value={p}
                      className={cn(
                        "focus:bg-[rgba(var(--color-primary),0.15)]",
                        p === priority && "bg-[rgba(var(--color-primary),0.1)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {PRIORITY_CONFIG[p].icon}
                        <span className="capitalize">{p}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Points Field */}
            <div className="space-y-2">
              <Label htmlFor="points" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
                <Hash size={14} /> Points
              </Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => {
                  setPoints(e.target.value === '' ? '' : Number(e.target.value));
                  if (error && e.target.value.trim() && !isNaN(Number(e.target.value))) setError(null);
                }}
                className={cn(
                  "h-10 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow transition-all",
                  error && points !== '' && isNaN(Number(points)) && "border-rose-500 bg-rose-500/5"
                )}
                placeholder="e.g. 5"
                min="0"
              />
            </div>

            {/* Status Field */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
                <AlignLeft size={14} /> Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as KanbanStatus)}>
                <SelectTrigger className="h-10 focus-glow border-[rgba(var(--color-border),0.7)]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
                  {KanbanStatusValues.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-[rgb(var(--color-text-muted))] mt-2 flex justify-end">
            <span className="flex items-center gap-1 px-2 py-1 bg-[rgba(var(--color-bg-secondary),0.5)] rounded-md border border-[rgba(var(--color-border),0.3)]">
              Press <kbd className="px-1.5 py-0.5 bg-[rgba(var(--color-bg-tertiary),0.8)] border border-[rgba(var(--color-border),0.7)] rounded text-[10px] font-mono">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 bg-[rgba(var(--color-bg-tertiary),0.8)] border border-[rgba(var(--color-border),0.7)] rounded text-[10px] font-mono">Enter</kbd> to save
            </span>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-[rgba(var(--color-border),0.5)] gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-border),0.15)] flex items-center gap-1.5"
          >
            <X size={16} />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className={cn(
              "min-w-[120px] bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary),0.9)] text-white flex items-center gap-1.5 transition-all",
              isSaving && "opacity-90"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserStoryEditModal;
