// FILE: views/KanbanEditModal.tsx
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
  SelectValue 
} from '@/components/ui/select';
import { KanbanItem, KanbanPriority, KanbanPriorityValues } from '@/types';
import { 
  Loader2, 
  AlertCircle, 
  Calendar, 
  ArrowRight, 
  Flag, 
  AlignLeft, 
  Check, 
  X,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanEditModalProps {
  item: KanbanItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<Omit<KanbanItem, 'id' | 'createdAt'>>) => Promise<void>;
  isSaving: boolean;
}

const KanbanEditModal: React.FC<KanbanEditModalProps> = ({
  item, isOpen, onClose, onSave, isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<KanbanPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDetails(item.details || '');
      setPriority(item.priority);
      setDueDate(item.dueDate ? item.dueDate.split('T')[0] : '');
      setError(null);
    } else {
      // Reset form fields if no item or modal is closed and reopened
      setTitle('');
      setDetails('');
      setPriority('medium');
      setDueDate('');
      setError(null);
    }
  }, [item, isOpen]);

  const handleSave = async () => {
    if (!item) return;
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    let isoDueDate: string | null = null;
    if (dueDate) {
        try {
            // Create a Date object. Input type="date" provides date in local timezone.
            // To ensure consistency, treat it as UTC date then convert to ISO string.
            const dateParts = dueDate.split('-').map(Number);
            const utcDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
            if (!isNaN(utcDate.getTime())) {
                isoDueDate = utcDate.toISOString();
            } else {
                setError('Invalid date format');
                return;
            }
        } catch (e) {
            setError('Error parsing date');
            return;
        }
    }

    const updatedData: Partial<Omit<KanbanItem, 'id' | 'createdAt'>> = {
      title: title.trim(),
      details: details.trim() ? details.trim() : null,
      priority,
      dueDate: isoDueDate,
    };
    
    try {
      await onSave(item.id, updatedData);
    } catch (err) {
      setError('Failed to save changes');
    }
  };

  if (!isOpen || !item) return null;

  // Priority configuration for visual styling
  const priorityConfig = {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] glass border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-primary))] shadow-xl animate-slide-up">
        <DialogHeader className="pb-3 border-b border-[rgba(var(--color-border),0.5)]">
          <DialogTitle className="text-[rgb(var(--color-primary))] text-xl flex items-center gap-2">
            <Edit2 size={18} className="text-[rgb(var(--color-primary))]" />
            Edit Task
          </DialogTitle>
          <DialogDescription className="text-[rgb(var(--color-text-muted))]">
            Update the details of your task below
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center text-rose-500 text-sm">
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
              className="h-10 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow"
              placeholder="Enter task title"
            />
          </div>
          
          {/* Details Field */}
          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <AlignLeft size={14} /> Description
            </Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[100px] bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow resize-none"
              placeholder="Add more details about this task..."
            />
          </div>
          
          {/* Priority and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority Field */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
                <Flag size={14} /> Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as KanbanPriority)}>
                <SelectTrigger 
                  className={cn(
                    "h-10 focus-glow border-[rgba(var(--color-border),0.7)]",
                    priorityConfig[priority].className
                  )}
                >
                  <SelectValue placeholder="Select priority">
                    <div className="flex items-center gap-2">
                      {priorityConfig[priority].icon}
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
                        {priorityConfig[p].icon}
                        <span className="capitalize">{p}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Due Date Field */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
                <Calendar size={14} /> Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow"
              />
            </div>
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
            className="min-w-[120px] bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary),0.9)] text-white flex items-center gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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

export default KanbanEditModal;