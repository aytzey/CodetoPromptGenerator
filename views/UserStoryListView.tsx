// views/UserStoryListView.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  UserStory,
  KanbanPriorityValues,
  KanbanStatusValues,
  Task, // Import Task type
} from '@/types';
import { useUserStoryStore } from '@/stores/useUserStoryStore';
import { useUserStoryService } from '@/services/userStoryServiceHooks';
import { useKanbanStore } from '@/stores/useKanbanStore'; // Import Kanban store to get task details
import { useKanbanService } from '@/services/kanbanServiceHooks'; // Import Kanban service to create tasks
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  X, // For clearing search/filter
  Calendar, // ADDED: Calendar icon import
  ClipboardList, // For tasks icon
  Link2, // For task association status
  Circle, // For task status dot
  Unlink, // ADDED: Unlink icon for disassociating tasks
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, // For the simple task display modal
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import UserStoryEditModal from './UserStoryEditModal';
// import TaskStoryAssociationModal from './TaskStoryAssociationModal'; // To view associated tasks


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

const STATUS_CONFIG = {
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
  const { stories, isLoading, isSaving, getStoryById } = useUserStoryStore(); // Destructure getStoryById
  const { loadStories, createStory, updateStory, deleteStory, addTaskToStory, removeTaskFromStory } = useUserStoryService(); // Add removeTaskFromStory
  const { items: allKanbanTasks } = useKanbanStore(); // Corrected: Get items directly from useKanbanStore
  const { create: createKanbanTask, load: loadKanbanTasks } = useKanbanService(); // Kanban service functions

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<KanbanPriority | null>(null);
  const [filterStatus, setFilterStatus] = useState<KanbanStatus | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null); // Null for create
  const [storyTaskAssociation, setStoryTaskAssociation] = useState<UserStory | null>(null);
  const [isTaskAssociationModalOpen, setIsTaskAssociationModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingNewTask, setIsAddingNewTask] = useState(false);
  const [isUnlinkingTask, setIsUnlinkingTask] = useState(false); // New state for unlink loading

  // Load stories on mount
  useEffect(() => {
    loadStories();
    loadKanbanTasks(); // Also load Kanban tasks
  }, [loadStories, loadKanbanTasks]);

  // Filter stories based on search and filters
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

  // Get associated task details for the modal
  const associatedTasks = useMemo(() => {
    if (!storyTaskAssociation || !storyTaskAssociation.taskIds) return [];
    return storyTaskAssociation.taskIds
      .map(taskId => allKanbanTasks.find(task => task.id === taskId))
      .filter((task): task is Task => task !== undefined); // Filter out undefined tasks
  }, [storyTaskAssociation, allKanbanTasks]);


  // Handlers
  const handleCreateNewStory = () => {
    setEditingStory(null); // Indicate new story creation
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
      // 1. Create the new Kanban task
      const newTask = await createKanbanTask({
        title: newTaskTitle.trim(),
        status: 'todo', // Default status for new tasks
        priority: 'medium', // Default priority
      });

      if (newTask) {
        // 2. Associate the new task with the current user story
        await addTaskToStory(storyTaskAssociation.id, newTask.id);
        
        // 3. Refresh data to reflect changes
        loadKanbanTasks();
        await loadStories(); // Await loadStories to ensure store is updated

        // 4. Update the local storyTaskAssociation state with the fresh data from the store
        // This ensures the associatedTasks memo re-evaluates with the correct story.taskIds
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
        // Refresh stories and Kanban tasks to ensure global state is updated
        await loadStories();
        loadKanbanTasks();

        // Crucially, update the local storyTaskAssociation state
        // Get the freshest story from the store after the update
        const updatedStoryFromStore = getStoryById(storyId);
        if (updatedStoryFromStore) {
            setStoryTaskAssociation(updatedStoryFromStore);
        }
      }
    } finally {
      setIsUnlinkingTask(false);
    }
  };


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
        <div className="flex gap-2 mb-2">
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
            <div className="space-y-4 py-1">
              {filteredStories.map((story) => (
                <div
                  key={story.id}
                  className="group relative bg-[rgba(var(--color-bg-secondary),0.3)] hover:bg-[rgba(var(--color-bg-secondary),0.5)] border border-[rgba(var(--color-border),0.4)] hover:border-[rgba(var(--color-border),0.6)] rounded-lg p-4 transition-all duration-200 ease-out hover:shadow-sm"
                >
                  {/* Priority indicator line */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 w-1 h-full rounded-l-lg transition-all duration-200',
                      PRIORITY_CONFIG[story.priority].bgColor.replace('/10', '/40'), // Make it stronger for the line
                    )}
                  />

                  <div className="pl-2">
                    <h3 className="text-base font-medium text-[rgb(var(--color-text-primary))] line-clamp-2 mb-2">
                      {story.title}
                    </h3>
                    {story.description && (
                      <p className="text-sm text-[rgb(var(--color-text-muted))] line-clamp-3 mb-2">
                        {story.description}
                      </p>
                    )}
                    {story.acceptanceCriteria && (
                      <div className="mt-2 text-xs text-[rgb(var(--color-text-muted))] border-t border-[rgba(var(--color-border),0.3)] pt-2">
                        <span className="font-semibold text-[rgb(var(--color-text-secondary))]">Acceptance Criteria:</span>
                        <p className="line-clamp-2">{story.acceptanceCriteria}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
                      <div className="flex items-center gap-2">
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
                                <Badge
                                  variant="secondary"
                                  className="h-5 px-1.5 text-[10px] font-medium cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Assuming a modal or view to show tasks for this story
                                    handleViewAssociatedTasks(story);
                                  }}
                                >
                                  <ListTodo size={10} className="mr-0.5" />
                                  {story.taskIds.length} tasks
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Linked to {story.taskIds.length} user {story.taskIds.length === 1 ? 'task' : 'tasks'}</p>
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
                          >
                            <Trash2 size={12} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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