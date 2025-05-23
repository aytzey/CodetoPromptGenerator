// views/TaskStoryAssociationModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search,
  BookOpen,
  Loader2,
  Link2,
  Unlink, // ADDED: Unlink icon
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, UserStory } from '@/types';
import { useUserStoryStore } from '@/stores/useUserStoryStore';
import { useUserStoryService } from '@/services/userStoryServiceHooks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskStoryAssociationModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_COLORS = {
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  high: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
};

const TaskStoryAssociationModal: React.FC<TaskStoryAssociationModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { stories, isLoading, isSaving } = useUserStoryStore();
  const { loadStories, addTaskToStory, removeTaskFromStory } = useUserStoryService();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoryIds, setSelectedStoryIds] = useState<Set<number>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<{
    toAdd: number[];
    toRemove: number[];
  }>({ toAdd: [], toRemove: [] });

  // Load stories on mount
  useEffect(() => {
    if (isOpen) {
      loadStories();
    }
  }, [isOpen, loadStories]);

  // Initialize selected stories when task changes
  useEffect(() => {
    if (task && task.userStoryIds) {
      setSelectedStoryIds(new Set(task.userStoryIds));
      setPendingChanges({ toAdd: [], toRemove: [] });
    } else {
      setSelectedStoryIds(new Set());
      setPendingChanges({ toAdd: [], toRemove: [] });
    }
  }, [task]);

  // Filter stories based on search
  const filteredStories = stories.filter(story =>
    story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    story.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStory = (storyId: number) => {
    const newSelected = new Set(selectedStoryIds);
    const originalIds = new Set(task?.userStoryIds || []);
    
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
      
      // Track changes
      if (originalIds.has(storyId)) {
        setPendingChanges(prev => ({
          toAdd: prev.toAdd.filter(id => id !== storyId),
          toRemove: [...prev.toRemove, storyId],
        }));
      } else {
        setPendingChanges(prev => ({
          toAdd: prev.toAdd.filter(id => id !== storyId),
          toRemove: prev.toRemove,
        }));
      }
    } else {
      newSelected.add(storyId);
      
      // Track changes
      if (!originalIds.has(storyId)) {
        setPendingChanges(prev => ({
          toAdd: [...prev.toAdd, storyId],
          toRemove: prev.toRemove.filter(id => id !== storyId),
        }));
      } else {
        setPendingChanges(prev => ({
          toAdd: prev.toAdd,
          toRemove: prev.toRemove.filter(id => id !== storyId),
        }));
      }
    }
    
    setSelectedStoryIds(newSelected);
  };

  const handleSave = async () => {
    if (!task) return;
    
    // Apply all changes
    for (const storyId of pendingChanges.toRemove) {
      await removeTaskFromStory(storyId, task.id);
    }
    
    for (const storyId of pendingChanges.toAdd) {
      await addTaskToStory(storyId, task.id);
    }
    
    onClose();
  };

  const hasChanges = pendingChanges.toAdd.length > 0 || pendingChanges.toRemove.length > 0;

  if (!isOpen || !task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] glass border-[rgba(var(--color-border),0.7)]">
        <DialogHeader className="pb-3 border-b border-[rgba(var(--color-border),0.5)]">
          <DialogTitle className="text-[rgb(var(--color-primary))] flex items-center gap-2">
            <Link2 size={18} />
            Manage Story Associations
          </DialogTitle>
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
            Link "{task.title}" to user stories
          </p>
        </DialogHeader>

        <div className="py-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user stories..."
              className="pl-9 h-9 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)]"
            />
          </div>

          {/* Story list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--color-primary))]" />
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-[rgb(var(--color-text-muted))] opacity-50 mx-auto mb-3" />
              <p className="text-sm text-[rgb(var(--color-text-muted))]">
                {searchTerm ? 'No stories match your search' : 'No user stories yet'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-2">
                {filteredStories.map(story => {
                  const isSelected = selectedStoryIds.has(story.id);
                  const isOriginallyLinked = task.userStoryIds?.includes(story.id) ?? false;
                  const willBeAdded = pendingChanges.toAdd.includes(story.id);
                  const willBeRemoved = pendingChanges.toRemove.includes(story.id);
                  
                  return (
                    <div
                      key={story.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-all',
                        'hover:bg-[rgba(var(--color-bg-secondary),0.3)]',
                        isSelected
                          ? 'border-[rgba(var(--color-primary),0.5)] bg-[rgba(var(--color-primary),0.05)]'
                          : 'border-[rgba(var(--color-border),0.4)]',
                        willBeAdded && 'ring-1 ring-emerald-500/50',
                        willBeRemoved && 'ring-1 ring-rose-500/50'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleStory(story.id)}
                        className="mt-0.5"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-[rgb(var(--color-text-primary))] truncate">
                            {story.title}
                          </h4>
                          {isOriginallyLinked && !willBeRemoved && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                              <Link2 size={10} className="mr-0.5" />
                              Linked
                            </Badge>
                          )}
                          {willBeAdded && (
                            <Badge className="text-[10px] h-4 px-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              + Add
                            </Badge>
                          )}
                          {willBeRemoved && (
                            <Badge className="text-[10px] h-4 px-1 bg-rose-500/20 text-rose-400 border-rose-500/30">
                              <Unlink size={10} className="mr-0.5" />
                              Remove
                            </Badge>
                          )}
                        </div>
                        
                        {story.description && (
                          <p className="text-xs text-[rgb(var(--color-text-muted))] line-clamp-2 mb-2">
                            {story.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] h-4 px-1.5 border',
                              PRIORITY_COLORS[story.priority]
                            )}
                          >
                            <Flag size={9} className="mr-0.5" />
                            {story.priority}
                          </Badge>
                          {story.points && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 border-[rgba(var(--color-border),0.5)]"
                            >
                              {story.points} pts
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5 border-[rgba(var(--color-border),0.5)]"
                          >
                            {story.taskIds?.length || 0} tasks
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Unlink Button (only if originally linked and not already marked for removal) */}
                      {isOriginallyLinked && !willBeRemoved && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                                onClick={() => handleToggleStory(story.id)} // Mark for removal
                                disabled={isSaving}
                              >
                                <Unlink size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Unlink Task</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Link Button (only if NOT originally linked and NOT already marked for addition) */}
                      {!isOriginallyLinked && !willBeAdded && (
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10"
                                 onClick={() => handleToggleStory(story.id)} // Mark for addition
                                 disabled={isSaving}
                               >
                                 <Link2 size={14} />
                               </Button>
                             </TooltipTrigger>
                             <TooltipContent side="left">Link Task</TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="border-t border-[rgba(var(--color-border),0.5)] pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[rgba(var(--color-border),0.7)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              'bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))]/90',
              hasChanges && 'animate-pulse'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              <>
                Save Changes
                {hasChanges && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    {pendingChanges.toAdd.length + pendingChanges.toRemove.length}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskStoryAssociationModal;