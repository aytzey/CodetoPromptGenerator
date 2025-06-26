// views/UserStoryListView.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  UserStory,
  KanbanPriorityValues,
  KanbanStatusValues,
  Task, 
  KanbanPriority,
  KanbanStatus,
  Actor,
} from '@/types';
import { useUserStoryStore } from '@/stores/useUserStoryStore';
import { useUserStoryService } from '@/services/userStoryServiceHooks';
import { useKanbanStore } from '@/stores/useKanbanStore'; 
import { useKanbanService } from '@/services/kanbanServiceHooks'; 
import { useAppStore } from '@/stores/useAppStore'; 
import { useActorStore } from '@/stores/useActorStore'; 
import { usePromptStore } from '@/stores/usePromptStore'; // Ensure this is used for main instructions
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox'; 
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  Filter,
  Flag,
  BookOpen,
  ListTodo,
  Hash,
  ListOrdered,
  RefreshCw,
  X, 
  Calendar, 
  ClipboardList, 
  Link2, 
  Circle, 
  Unlink,
  FileText, 
  XCircle, 
  CheckSquare, 
  Square, 
  Check, 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import UserStoryEditModal from './UserStoryEditModal';


const PRIORITY_CONFIG: Record<KanbanPriority, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
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

const STATUS_CONFIG: Record<KanbanStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  todo: {
    label: 'To Do',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  done: {
    label: 'Done',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
};

const UserStoryListView: React.FC = () => {
  const stories = useUserStoryStore(s => s.stories);
  const isLoading = useUserStoryStore(s => s.isLoading);
  const isSaving = useUserStoryStore(s => s.isSaving);
  const getStoryById = useUserStoryStore(s => s.getStoryById);
  const selectedStoryIds = useUserStoryStore(s => s.selectedStoryIds); 
  const toggleStorySelection = useUserStoryStore(s => s.toggleStorySelection); 
  const setSelectedStoryIdsBatch = useUserStoryStore(s => s.setSelectedStoryIdsBatch); 
  const clearSelectedStories = useUserStoryStore(s => s.clearSelectedStories); 

  const { loadStories, createStory, updateStory, deleteStory, addTaskToStory, removeTaskFromStory } = useUserStoryService();
  
  const allKanbanTasks = useKanbanStore(s => s.items); 
  const { create: createKanbanTask, load: loadKanbanTasks } = useKanbanService(); 

  const { setNotification } = useAppStore(); // Only get setNotification from useAppStore
  const { setMainInstructions } = usePromptStore(); // Get setMainInstructions from usePromptStore
  const { getActorById } = useActorStore(); 

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<KanbanPriority | null>(null);
  const [filterStatus, setFilterStatus] = useState<KanbanStatus | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null); 
  const [storyTaskAssociation, setStoryTaskAssociation] = useState<UserStory | null>(null);
  const [isTaskAssociationModalOpen, setIsTaskAssociationModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingNewTask, setIsAddingNewTask] = useState(false);
  const [isUnlinkingTask, setIsUnlinkingTask] = useState(false); 

  useEffect(() => {
    loadStories();
    loadKanbanTasks(); 
  }, [loadStories, loadKanbanTasks]);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesSearch = searchTerm
        ? story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (story.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
          (story.acceptanceCriteria?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        : true;
      const matchesPriority = filterPriority ? story.priority === filterPriority : true;
      const matchesStatus = filterStatus ? story.status === filterStatus : true;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [stories, searchTerm, filterPriority, filterStatus]);

  const associatedTasks = useMemo(() => {
    if (!storyTaskAssociation || !storyTaskAssociation.taskIds) return [];
    return storyTaskAssociation.taskIds
      .map(taskId => allKanbanTasks.find(task => task.id === taskId))
      .filter((task): task is Task => task !== undefined); 
  }, [storyTaskAssociation, allKanbanTasks]);


  const handleCreateNewStory = () => {
    setEditingStory(null); 
    setIsEditModalOpen(true);
  };

  const handleEditStory = useCallback((story: UserStory) => {
    setEditingStory(story);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveStory = useCallback(
    async (
      id: number | null,
      data: Partial<Omit<UserStory, 'id' | 'createdAt' | 'taskIds'>>
    ) => {
      if (id) {
        await updateStory({ id, ...data });
      } else {
        await createStory(data as Omit<UserStory, 'id' | 'createdAt' | 'taskIds'>);
      }
      setIsEditModalOpen(false);
      setEditingStory(null);
    },
    [createStory, updateStory]
  );

  const handleDeleteStory = useCallback(
    async (id: number) => {
      if (confirm('Are you sure you want to delete this user story?')) {
        await deleteStory(id);
      }
    },
    [deleteStory]
  );

  const handleViewAssociatedTasks = useCallback((story: UserStory) => {
    setStoryTaskAssociation(story);
    setIsTaskAssociationModalOpen(true);
  }, []);

  const handleAddNewTaskAndAssociate = async () => {
    if (!newTaskTitle.trim() || !storyTaskAssociation) return;

    setIsAddingNewTask(true);
    try {
      const newTask = await createKanbanTask({
        title: newTaskTitle.trim(),
        status: 'todo', 
        priority: 'medium', 
      });

      if (newTask) {
        await addTaskToStory(storyTaskAssociation.id, newTask.id);
        loadKanbanTasks();
        await loadStories(); 
        const updatedStoryFromStore = getStoryById(storyTaskAssociation.id);
        if (updatedStoryFromStore) {
            setStoryTaskAssociation(updatedStoryFromStore);
        }
        setNewTaskTitle('');
      }
    } finally {
      setIsAddingNewTask(false);
    }
  };

  const handleUnlinkTask = async (storyId: number, taskId: number) => {
    setIsUnlinkingTask(true);
    try {
      const success = await removeTaskFromStory(storyId, taskId);
      if (success) {
        await loadStories();
        loadKanbanTasks();
        const updatedStoryFromStore = getStoryById(storyId);
        if (updatedStoryFromStore) {
            setStoryTaskAssociation(updatedStoryFromStore);
        }
      }
    } finally {
      setIsUnlinkingTask(false);
    }
  };

  const generateInstructionFromStories = useCallback((selectedStories: UserStory[]): string => {
    console.log("[UserStoryListView] generateInstructionFromStories called with:", selectedStories);
    if (!selectedStories.length) {
      console.log("[UserStoryListView] No stories provided to generateInstructionFromStories.");
      return "No user stories selected.";
    }

    let instruction = "## Generated Instruction from User Stories ##\n\n";
    instruction += "The following user stories have been selected to guide the next development task:\n\n";

    selectedStories.forEach((story, index) => {
      let actorName = 'N/A';
      if (story.actorId) {
        try {
          const actor = getActorById(story.actorId);
          if (actor && actor.name) {
            actorName = actor.name;
          } else if (actor) { // Actor exists but no name
            actorName = `Actor ID ${story.actorId} (Name not found)`;
            console.warn(`[UserStoryListView] Actor ID ${story.actorId} found but has no name.`);
          } else { // Actor not found
            actorName = `Actor ID ${story.actorId} (Actor not found)`;
            console.warn(`[UserStoryListView] Actor ID ${story.actorId} not found in store.`);
          }
        } catch (e) {
          console.error(`[UserStoryListView] Error fetching actor with ID ${story.actorId}:`, e);
          actorName = `Actor ID ${story.actorId} (Error fetching actor details)`;
        }
      }

      instruction += `---
**USER STORY ${index + 1} (ID: ${story.id})**
**Title:** ${story.title}
**As a:** ${actorName}
**I want to:** ${story.description || 'N/A'}

**Acceptance Criteria:**
${story.acceptanceCriteria ? story.acceptanceCriteria.split('\n').map(ac => `- ${ac.trim()}`).join('\n') : '- N/A'}

**Priority:** ${story.priority}
**Status:** ${story.status}
**Points:** ${story.points ?? 'N/A'}
**Associated Tasks Count:** ${story.taskIds?.length || 0}
---\n\n`;
    });

    instruction += `**General Considerations:**
- Ensure all acceptance criteria for the selected stories are met.
- Pay attention to the specified priorities and story points for effort estimation.
- Consider the user actors involved to maintain a user-centric approach.
`;
    console.log("[UserStoryListView] Generated instruction string:", instruction);
    return instruction;
  }, [getActorById]);

  const handleGenerateInstruction = useCallback(() => {
    console.log("[UserStoryListView] handleGenerateInstruction called. Selected IDs:", selectedStoryIds);

    const storiesToProcess = selectedStoryIds
      .map(id => {
        const story = getStoryById(id);
        if (!story) console.warn(`[UserStoryListView] Story with ID ${id} not found in store.`);
        return story;
      })
      .filter((s): s is UserStory => s !== undefined);

    console.log("[UserStoryListView] Stories to process:", storiesToProcess);

    if (storiesToProcess.length === 0) {
      console.log("[UserStoryListView] No stories to process, returning.");
      setNotification({ type: 'warning', message: 'No stories selected to generate instruction.' });
      return;
    }

    const instructionText = generateInstructionFromStories(storiesToProcess);
    
    try {
      // Use setMainInstructions from usePromptStore
      setMainInstructions(instructionText); // Corrected: Directly use setMainInstructions from usePromptStore
      console.log("[UserStoryListView] setMainInstructions (from usePromptStore) called successfully."); // Updated log
    } catch (e) {
      console.error("[UserStoryListView] Error calling setMainInstructions (from usePromptStore):", e);
      setNotification({ type: 'error', message: 'Failed to update main instruction. Check console.' });
      return; 
    }
    
    try {
      setNotification({ type: 'success', message: `Instruction generated from ${storiesToProcess.length} user stor${storiesToProcess.length === 1 ? 'y' : 'ies'} and copied to main instructions.` });
      console.log("[UserStoryListView] setNotification called successfully.");
    } catch (e) {
      console.error("[UserStoryListView] Error calling setNotification:", e);
    }

    clearSelectedStories();
    console.log("[UserStoryListView] clearSelectedStories called.");
  }, [selectedStoryIds, getStoryById, generateInstructionFromStories, setMainInstructions, setNotification, clearSelectedStories]); // Added setMainInstructions to dependencies

  const handleToggleSelectAllVisible = useCallback(() => {
    const visibleStoryIds = filteredStories.map(s => s.id);
    if (visibleStoryIds.length === 0) return;

    const allVisibleAreSelected = visibleStoryIds.every(id => selectedStoryIds.includes(id));

    if (allVisibleAreSelected) {
      const newSelection = selectedStoryIds.filter(id => !visibleStoryIds.includes(id));
      setSelectedStoryIdsBatch(newSelection);
    } else {
      const newSelection = Array.from(new Set([...selectedStoryIds, ...visibleStoryIds]));
      setSelectedStoryIdsBatch(newSelection);
    }
  }, [filteredStories, selectedStoryIds, setSelectedStoryIdsBatch]);

  const allVisibleSelected = useMemo(() => {
    if (filteredStories.length === 0) return false;
    return filteredStories.every(s => selectedStoryIds.includes(s.id));
  }, [filteredStories, selectedStoryIds]);

  const someVisibleSelected = useMemo(() => {
    return filteredStories.some(s => selectedStoryIds.includes(s.id));
  }, [filteredStories, selectedStoryIds]);


  if (isLoading && !stories.length) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--color-primary))] mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--color-text-muted))]">Loading user stories...</p>
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
              <BookOpen size={18} className="text-[rgb(var(--color-tertiary))]" />
              User Stories
            </h2>
            <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
              Define user-centric features and requirements
            </p>
          </div>
          <Button
            onClick={handleCreateNewStory}
            className="bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-tertiary))]/80 hover:from-[rgb(var(--color-tertiary))] hover:to-[rgb(var(--color-accent-1))]/80 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            disabled={isSaving}
          >
            <Plus size={16} className="mr-2" />
            Add Story
          </Button>
        </div>

        {/* Search and filters */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 mb-2 items-center">
          {filteredStories.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Checkbox
                    id="select-all-visible"
                    checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                    onCheckedChange={handleToggleSelectAllVisible}
                    aria-label={allVisibleSelected ? "Deselect all visible stories" : "Select all visible stories"}
                    className="mr-2 border-[rgba(var(--color-border),0.7)] data-[state=checked]:bg-[rgb(var(--color-primary))] data-[state=indeterminate]:bg-[rgb(var(--color-primary),0.6)]"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {allVisibleSelected ? "Deselect all visible" : "Select all visible"} ({filteredStories.length} storie{filteredStories.length === 1 ? 's' : ''})
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {filteredStories.length === 0 && <div/>} {/* Placeholder for grid alignment */}


          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stories by title, description..."
              className="pl-9 h-9 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)] focus:border-[rgba(var(--color-tertiary),0.5)]"
            />
          </div>

          <Select
            value={filterPriority || 'all'}
            onValueChange={(val) => setFilterPriority(val === 'all' ? null : val as KanbanPriority)}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)] focus:border-[rgba(var(--color-tertiary),0.5)]">
              <Filter size={14} className="mr-1" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
              <SelectItem value="all">All Priorities</SelectItem>
              {KanbanPriorityValues.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  <div className="flex items-center gap-2">
                    {PRIORITY_CONFIG[p].icon} {p}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterStatus || 'all'}
            onValueChange={(val) => setFilterStatus(val === 'all' ? null : val as KanbanStatus)}
          >
            <SelectTrigger className="w-[120px] h-9 text-xs bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)] focus:border-[rgba(var(--color-tertiary),0.5)]">
              <ListTodo size={14} className="mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="glass border-[rgba(var(--color-border),0.7)]">
              <SelectItem value="all">All Statuses</SelectItem>
              {KanbanStatusValues.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s].color.replace('text-', 'bg-'))} />
                    {s.replace(/-/g, ' ')}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadStories}>
                  <RefreshCw size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh stories</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Active filters display */}
        {(searchTerm || filterPriority || filterStatus) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[rgb(var(--color-text-muted))]">
            <span>Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Search: "{searchTerm}"
                <Button variant="ghost" size="icon" className="h-3 w-3 ml-1" onClick={() => setSearchTerm('')}>
                  <X size={10} />
                </Button>
              </Badge>
            )}
            {filterPriority && (
              <Badge variant="secondary" className="text-xs">
                Priority: {PRIORITY_CONFIG[filterPriority].label}
                <Button variant="ghost" size="icon" className="h-3 w-3 ml-1" onClick={() => setFilterPriority(null)}>
                  <X size={10} />
                </Button>
              </Badge>
            )}
            {filterStatus && (
              <Badge variant="secondary" className="text-xs">
                Status: {STATUS_CONFIG[filterStatus].label}
                <Button variant="ghost" size="icon" className="h-3 w-3 ml-1" onClick={() => setFilterStatus(null)}>
                  <X size={10} />
                </Button>
              </Badge>
            )}
          </div>
        )}

        {/* Contextual Action Bar for Selected Stories */}
        {selectedStoryIds.length > 0 && (
          <div className="my-3 p-2.5 rounded-lg bg-[rgba(var(--color-bg-tertiary),0.6)] border border-[rgba(var(--color-border),0.4)] flex items-center justify-between gap-3 shadow-sm">
            <span className="text-sm font-medium text-[rgb(var(--color-text-secondary))]">
              {selectedStoryIds.length} storie{selectedStoryIds.length === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleGenerateInstruction} 
                      size="sm"
                      className="bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary),0.9)] text-white"
                    >
                      <FileText size={15} className="mr-1.5" />
                      Generate Instruction
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate instruction from selected stories</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={clearSelectedStories}>
                      <XCircle size={15} className="mr-1.5" />
                      Clear Selection
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Deselect all stories</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>

      {/* User Story List */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full pr-4">
          {filteredStories.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-[rgb(var(--color-text-muted))]">
              <BookOpen size={48} className="mb-3 opacity-50" />
              <p className="text-lg font-medium">No User Stories Found</p>
              <p className="text-sm mt-1 max-w-xs">
                {searchTerm || filterPriority || filterStatus
                  ? 'No stories match your current filters.'
                  : 'Start by adding a new user story using the "Add Story" button above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-1"> {/* Reduced space-y for tighter packing with checkboxes */}
              {filteredStories.map((story) => (
                <div
                  key={story.id}
                  className={cn(
                    "group relative bg-[rgba(var(--color-bg-secondary),0.3)] hover:bg-[rgba(var(--color-bg-secondary),0.5)] border border-[rgba(var(--color-border),0.4)] hover:border-[rgba(var(--color-border),0.6)] rounded-lg p-3 transition-all duration-200 ease-out hover:shadow-sm cursor-pointer", 
                    selectedStoryIds.includes(story.id) && "ring-2 ring-[rgb(var(--color-primary))] bg-[rgba(var(--color-primary),0.05)] shadow-md" 
                  )}
                  onClick={(e) => { 
                     const target = e.target as HTMLElement;
                     if (target.closest('button, a, [role="button"], [data-no-propagate="true"], input[type="checkbox"]')) { // Updated to include checkbox
                       return;
                     }
                     toggleStorySelection(story.id);
                  }}
                >
                  {/* Priority indicator line */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 w-1 h-full rounded-l-lg transition-all duration-200',
                      PRIORITY_CONFIG[story.priority].bgColor.replace('/10', '/40'), 
                    )}
                  />
                  
                  <div className="flex items-start gap-3 pl-1"> 
                    <Checkbox
                      id={`story-select-${story.id}`}
                      checked={selectedStoryIds.includes(story.id)}
                      onCheckedChange={() => toggleStorySelection(story.id)}
                      className="mt-[5px] flex-shrink-0 border-[rgba(var(--color-border),0.7)] data-[state=checked]:bg-[rgb(var(--color-primary))]"
                      aria-label={`Select story titled ${story.title}`}
                      data-no-propagate="true" 
                    />
                    <div className="flex-1 min-w-0"> 
                      <h3 className="text-base font-medium text-[rgb(var(--color-text-primary))] line-clamp-2 mb-1.5">
                        {story.title}
                      </h3>
                      {story.description && (
                        <p className="text-sm text-[rgb(var(--color-text-muted))] line-clamp-2 mb-1.5">
                          {story.description}
                        </p>
                      )}
                      {story.acceptanceCriteria && (
                        <div className="mt-1.5 text-xs text-[rgb(var(--color-text-muted))] border-t border-[rgba(var(--color-border),0.3)] pt-1.5">
                          <span className="font-semibold text-[rgb(var(--color-text-secondary))]">Acceptance Criteria:</span>
                          <p className="line-clamp-2">{story.acceptanceCriteria}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2 mt-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-5 px-1.5 text-[10px] font-medium border',
                              PRIORITY_CONFIG[story.priority].bgColor,
                              PRIORITY_CONFIG[story.priority].borderColor,
                              PRIORITY_CONFIG[story.priority].color
                            )}
                          >
                            {PRIORITY_CONFIG[story.priority].icon}
                            <span className="ml-0.5">{PRIORITY_CONFIG[story.priority].label}</span>
                          </Badge>
                          {story.points && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] font-medium bg-purple-500/10 border-purple-500/30 text-purple-400"
                            >
                              <Hash size={10} className="mr-0.5" />
                              {story.points} pts
                            </Badge>
                          )}
                          <Badge
                              variant="outline"
                              className={cn(
                                  'h-5 px-1.5 text-[10px] font-medium border',
                                  STATUS_CONFIG[story.status].bgColor,
                                  STATUS_CONFIG[story.status].borderColor,
                                  STATUS_CONFIG[story.status].color
                              )}
                          >
                              <div className={cn('w-2 h-2 rounded-full mr-1', STATUS_CONFIG[story.status].color.replace('text-', 'bg-'))} />
                              {STATUS_CONFIG[story.status].label}
                          </Badge>
                          {story.taskIds && story.taskIds.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    size="sm" 
                                    className="h-5 px-1.5 text-[10px] font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation(); 
                                      handleViewAssociatedTasks(story);
                                    }}
                                    data-no-propagate="true"
                                  >
                                    <ListTodo size={10} className="mr-0.5" />
                                    {story.taskIds.length} task{story.taskIds.length === 1 ? '' : 's'}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">View linked tasks ({story.taskIds.length})</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        
                        <div className="text-xs text-[rgb(var(--color-text-muted))] flex items-center gap-1.5">
                          <Calendar size={10} />
                          Created: {format(new Date(story.createdAt), 'MMM d, yyyy')}
                        </div>
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
                            className="h-7 w-7 bg-[rgb(var(--color-bg-primary))] border-[rgba(var(--color-border),0.5)] hover:border-[rgba(var(--color-tertiary),0.5)] hover:text-[rgb(var(--color-tertiary))]"
                            onClick={(e) => {
                              e.stopPropagation(); 
                              handleEditStory(story);
                            }}
                            data-no-propagate="true"
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
                              handleDeleteStory(story.id);
                            }}
                            data-no-propagate="true"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                   {/* Selected checkmark overlay */}
                  {selectedStoryIds.includes(story.id) && (
                    <div className="absolute top-2 right-2 p-0.5 bg-[rgb(var(--color-primary))] text-white rounded-full pointer-events-none" data-no-propagate="true">
                      <Check size={10} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Edit/Create Story Modal */}
      <UserStoryEditModal
        story={editingStory}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingStory(null);
        }}
        onSave={handleSaveStory}
        isSaving={isSaving}
      />
      {/* Task Association Modal (Simplified for UserStory View) */}
      {isTaskAssociationModalOpen && storyTaskAssociation && (
        <Dialog open={isTaskAssociationModalOpen} onOpenChange={setIsTaskAssociationModalOpen}>
            <DialogContent className="sm:max-w-[600px] glass border-[rgba(var(--color-border),0.7)]">
                <DialogHeader className="pb-3 border-b border-[rgba(var(--color-border),0.5)]">
                    <DialogTitle className="text-[rgb(var(--color-primary))] flex items-center gap-2">
                        <ClipboardList size={18} />
                        Tasks for Story: "{storyTaskAssociation.title}"
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    {/* Add new task input */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add new task for this story..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddNewTaskAndAssociate();
                                }
                            }}
                            className="flex-1 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)]"
                            disabled={isAddingNewTask}
                        />
                        <Button onClick={handleAddNewTaskAndAssociate} disabled={!newTaskTitle.trim() || isAddingNewTask}>
                            {isAddingNewTask ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            <span className="ml-2">Add Task</span>
                        </Button>
                    </div>

                    {/* List of associated tasks */}
                    <ScrollArea className="h-[250px] pr-4">
                        {associatedTasks.length > 0 ? (
                            <div className="space-y-3">
                                {associatedTasks.map(task => (
                                    <div 
                                        key={task.id} 
                                        className="flex items-center p-3 rounded-lg border border-[rgba(var(--color-border),0.4)] bg-[rgba(var(--color-bg-secondary),0.2)]"
                                    >
                                        <div className={cn(
                                            'w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0',
                                            STATUS_CONFIG[task.status].color.replace('text-', 'bg-')
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-[rgb(var(--color-text-primary))] line-clamp-1">{task.title}</h4>
                                            <p className="text-xs text-[rgb(var(--color-text-muted))] flex items-center gap-1">
                                                <Link2 size={10} /> Linked (Status: {STATUS_CONFIG[task.status].label})
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'h-5 px-1.5 text-[10px] font-medium border ml-2',
                                                PRIORITY_CONFIG[task.priority].bgColor,
                                                PRIORITY_CONFIG[task.priority].borderColor,
                                                PRIORITY_CONFIG[task.priority].color
                                            )}
                                        >
                                            {PRIORITY_CONFIG[task.priority].icon}
                                            <span className="ml-0.5">{PRIORITY_CONFIG[task.priority].label}</span>
                                        </Badge>
                                        {/* Unlink Button */}
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 ml-2 text-rose-500 hover:bg-rose-500/10"
                                                onClick={() => handleUnlinkTask(storyTaskAssociation.id, task.id)}
                                                disabled={isUnlinkingTask}
                                              >
                                                {isUnlinkingTask ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={14} />}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left">Unlink Task</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <ListTodo className="h-12 w-12 text-[rgb(var(--color-text-muted))] opacity-50 mx-auto mb-3" />
                                <p className="text-sm text-[rgb(var(--color-text-muted))]">
                                    No tasks associated with this story. Add one using the input above!
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter className="border-t border-[rgba(var(--color-border),0.5)] pt-3">
                    <Button variant="outline" onClick={() => setIsTaskAssociationModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserStoryListView;