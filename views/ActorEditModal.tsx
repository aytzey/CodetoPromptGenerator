// views/ActorEditModal.tsx
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
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertCircle,
  Edit2,
  Users, // Icon for Actor name
  AlignLeft, // Icon for Role
  KeyRound, // Icon for Permissions
  Target, // Icon for Goals
  Check,
  X,
  Plus, // For add button
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Actor } from '@/types';

interface ActorEditModalProps {
  actor: Actor | null; // Null for creation, object for editing
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: number | null, // null for new actor
    data: Partial<Omit<Actor, 'id'>>
  ) => Promise<void>;
  isSaving: boolean;
}

const ActorEditModal: React.FC<ActorEditModalProps> = ({
  actor,
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  // For managing new permission/goal input
  const [newPermission, setNewPermission] = useState('');
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    if (actor) {
      setName(actor.name);
      setRole(actor.role);
      setPermissions(actor.permissions || []);
      setGoals(actor.goals || []);
      setError(null);
    } else {
      // For new actor
      setName('');
      setRole('');
      setPermissions([]);
      setGoals([]);
      setError(null);
    }
    setNewPermission('');
    setNewGoal('');
  }, [actor, isOpen]);

  useEffect(() => {
    if (isOpen && !actor) { // Only auto-focus for new actors
      const timer = setTimeout(() => {
        setNameFocused(true);
      }, 100);
      return () => clearTimeout(timer);
    }
    setNameFocused(false);
  }, [isOpen, actor]);

  const handleAddPermission = () => {
    const trimmed = newPermission.trim();
    if (trimmed && !permissions.includes(trimmed)) {
      setPermissions(prev => [...prev, trimmed]);
      setNewPermission('');
    }
  };

  const handleRemovePermission = (perm: string) => {
    setPermissions(prev => prev.filter(p => p !== perm));
  };

  const handleAddGoal = () => {
    const trimmed = newGoal.trim();
    if (trimmed && !goals.includes(trimmed)) {
      setGoals(prev => [...prev, trimmed]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setGoals(prev => prev.filter(g => g !== goal));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Actor Name is required');
      return;
    }
    if (!role.trim()) {
      setError('Actor Role is required');
      return;
    }

    const updatedData: Partial<Omit<Actor, 'id'>> = {
      name: name.trim(),
      role: role.trim(),
      permissions: permissions.length > 0 ? permissions : undefined, // Send as undefined if empty
      goals: goals.length > 0 ? goals : undefined, // Send as undefined if empty
    };

    try {
      await onSave(actor?.id || null, updatedData);
    } catch (err) {
      setError('Failed to save changes');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isSaving && name.trim() && role.trim()) {
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handlePermissionInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPermission();
    }
  };

  const handleGoalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGoal();
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[620px] glass border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-primary))] shadow-xl animate-slide-up"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="pb-3 border-b border-[rgba(var(--color-border),0.5)]">
          <DialogTitle className="text-[rgb(var(--color-primary))] text-xl flex items-center gap-2">
            <Edit2 size={18} className="text-[rgb(var(--color-primary))]" />
            {actor ? 'Edit Actor' : 'Create New Actor'}
          </DialogTitle>
          <DialogDescription className="text-[rgb(var(--color-text-muted))]">
            {actor ? 'Update the details of this actor' : 'Define a new actor for your project'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center text-rose-500 text-sm animate-fade-in">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid gap-5 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <Users size={14} /> Actor Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error && e.target.value.trim()) setError(null);
              }}
              className={cn(
                "h-10 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow transition-all",
                error && !name.trim() && "border-rose-500 bg-rose-500/5"
              )}
              placeholder="e.g., Developer, External API, Admin"
              autoFocus={nameFocused}
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <AlignLeft size={14} /> Role / Primary Activities <span className="text-rose-400">*</span>
            </Label>
            <Textarea
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (error && e.target.value.trim()) setError(null);
              }}
              className={cn(
                "min-h-[80px] bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow resize-y",
                error && !role.trim() && "border-rose-500 bg-rose-500/5"
              )}
              placeholder="Describe what this actor does or represents in the system."
            />
          </div>

          {/* Permissions Field */}
          <div className="space-y-2">
            <Label htmlFor="permissions" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <KeyRound size={14} /> Key Permissions / Access Rights
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {permissions.map((perm, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] border-[rgba(var(--color-primary),0.3)] pr-1"
                >
                  {perm}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 text-[rgb(var(--color-primary))] hover:text-rose-500"
                    onClick={() => handleRemovePermission(perm)}
                  >
                    <X size={12} />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="new-permission"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                onKeyDown={handlePermissionInputKeyDown}
                className="flex-1 h-9 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow"
                placeholder="e.g., View data, Manage user accounts"
              />
              <Button onClick={handleAddPermission} disabled={!newPermission.trim()}>
                <Plus size={16} /> Add
              </Button>
            </div>
          </div>

          {/* Goals Field */}
          <div className="space-y-2">
            <Label htmlFor="goals" className="text-sm text-[rgb(var(--color-text-secondary))] flex items-center gap-1.5">
              <Target size={14} /> Primary Goals / Problems Solved
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {goals.map((goal, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-[rgba(var(--color-secondary),0.1)] text-[rgb(var(--color-secondary))] border-[rgba(var(--color-secondary),0.3)] pr-1"
                >
                  {goal}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 text-[rgb(var(--color-secondary))] hover:text-rose-500"
                    onClick={() => handleRemoveGoal(goal)}
                  >
                    <X size={12} />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="new-goal"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={handleGoalInputKeyDown}
                className="flex-1 h-9 bg-[rgba(var(--color-bg-secondary),0.8)] border-[rgba(var(--color-border),0.7)] focus-glow"
                placeholder="e.g., Generate prompts, Troubleshoot system"
              />
              <Button onClick={handleAddGoal} disabled={!newGoal.trim()}>
                <Plus size={16} /> Add
              </Button>
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
            disabled={isSaving || !name.trim() || !role.trim()}
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

export default ActorEditModal;