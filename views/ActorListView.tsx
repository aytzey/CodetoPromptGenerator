// views/ActorListView.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Actor,
} from '@/types';
import { useActorStore } from '@/stores/useActorStore';
import { useActorService } from '@/services/actorServiceHooks';
import { cn } from '@/lib/utils';

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
  Filter, // For filtering
  Users, // Icon for Actor name
  AlignLeft, // Icon for Role
  KeyRound, // Icon for Permissions
  Target, // Icon for Goals
  RefreshCw,
  X, // For clearing search/filter
  Info, // For details/about text
} from 'lucide-react';

import ActorEditModal from './ActorEditModal';


const ActorListView: React.FC = () => {
  const { actors, isLoading, isSaving } = useActorStore();
  const { loadActors, createActor, updateActor, deleteActor } = useActorService();

  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<Actor | null>(null); // Null for create

  // Load actors on mount
  useEffect(() => {
    loadActors();
  }, [loadActors]);

  // Filter actors based on search
  const filteredActors = useMemo(() => {
    return actors.filter((actor: { name: string; role: string; permissions: any[]; goals: any[]; }) => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      return (
        actor.name.toLowerCase().includes(lowerSearchTerm) ||
        actor.role.toLowerCase().includes(lowerSearchTerm) ||
        (actor.permissions && actor.permissions.some((p: string) => p.toLowerCase().includes(lowerSearchTerm))) ||
        (actor.goals && actor.goals.some((g: string) => g.toLowerCase().includes(lowerSearchTerm)))
      );
    });
  }, [actors, searchTerm]);

  // Handlers
  const handleCreateNewActor = () => {
    setEditingActor(null); // Indicate new actor creation
    setIsEditModalOpen(true);
  };

  const handleEditActor = useCallback((actor: Actor) => {
    setEditingActor(actor);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveActor = useCallback(
    async (
      id: number | null,
      data: Partial<Omit<Actor, 'id'>>
    ) => {
      if (id) {
        await updateActor({ id, ...data });
      } else {
        await createActor(data as Omit<Actor, 'id'>);
      }
      setIsEditModalOpen(false);
      setEditingActor(null);
    },
    [createActor, updateActor]
  );

  const handleDeleteActor = useCallback(
    async (id: number) => {
      if (confirm('Are you sure you want to delete this actor?')) {
        await deleteActor(id);
      }
    },
    [deleteActor]
  );


  if (isLoading && !actors.length) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--color-primary))] mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--color-text-muted))]">Loading actors...</p>
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
              <Users size={18} className="text-[rgb(var(--color-primary))]" />
              Actors
            </h2>
            <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
              Define the users and systems interacting with your product
            </p>
          </div>
          <Button
            onClick={handleCreateNewActor}
            className="bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-primary))]/80 hover:from-[rgb(var(--color-primary))] hover:to-[rgb(var(--color-accent-2))]/80 text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            disabled={isSaving}
          >
            <Plus size={16} className="mr-2" />
            Add Actor
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--color-text-muted))]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actors by name, role, permissions, or goals..."
              className="pl-9 h-9 bg-[rgba(var(--color-bg-secondary),0.3)] border-[rgba(var(--color-border),0.4)] focus:border-[rgba(var(--color-primary),0.5)]"
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={loadActors}>
                  <RefreshCw size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh actors</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Active filters display */}
        {searchTerm && (
          <div className="flex items-center gap-2 mt-2 text-xs text-[rgb(var(--color-text-muted))]">
            <span>Active filter:</span>
            <Badge variant="secondary" className="text-xs">
              Search: "{searchTerm}"
              <Button variant="ghost" size="icon" className="h-3 w-3 ml-1" onClick={() => setSearchTerm('')}>
                <X size={10} />
              </Button>
            </Badge>
          </div>
        )}
      </div>

      {/* Actor List */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full pr-4">
          {filteredActors.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-[rgb(var(--color-text-muted))]">
              <Users size={48} className="mb-3 opacity-50" />
              <p className="text-lg font-medium">No Actors Found</p>
              <p className="text-sm mt-1 max-w-xs">
                {searchTerm
                  ? 'No actors match your current search.'
                  : 'Start by adding a new actor using the "Add Actor" button above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              {filteredActors.map((actor: { id: React.Key | null | undefined; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; role: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; permissions: any[]; goals: any[]; }) => (
                <div
                  key={actor.id}
                  className="group relative bg-[rgba(var(--color-bg-secondary),0.3)] hover:bg-[rgba(var(--color-bg-secondary),0.5)] border border-[rgba(var(--color-border),0.4)] hover:border-[rgba(var(--color-border),0.6)] rounded-lg p-4 transition-all duration-200 ease-out hover:shadow-sm"
                >
                  {/* Left accent line */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 w-1 h-full rounded-l-lg transition-all duration-200',
                      'bg-[rgb(var(--color-accent-2))]' // A consistent accent color
                    )}
                  />

                  <div className="pl-2">
                    <h3 className="text-base font-medium text-[rgb(var(--color-text-primary))] line-clamp-2 mb-2">
                      {actor.name}
                    </h3>
                    {actor.role && (
                      <p className="text-sm text-[rgb(var(--color-text-muted))] line-clamp-3 mb-2">
                        {actor.role}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {actor.permissions && actor.permissions.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-medium bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] border-[rgba(var(--color-primary),0.3)] cursor-pointer"
                              >
                                <KeyRound size={10} className="mr-0.5" />
                                {actor.permissions.length} Permissions
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-medium mb-1">Permissions:</p>
                              <ul className="list-disc list-inside text-xs">
                                {actor.permissions.map((p: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, i: React.Key | null | undefined) => <li key={i}>{p}</li>)}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {actor.goals && actor.goals.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-medium bg-[rgba(var(--color-secondary),0.1)] text-[rgb(var(--color-secondary))] border-[rgba(var(--color-secondary),0.3)] cursor-pointer"
                              >
                                <Target size={10} className="mr-0.5" />
                                {actor.goals.length} Goals
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-medium mb-1">Goals:</p>
                              <ul className="list-disc list-inside text-xs">
                                {actor.goals.map((g: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, i: React.Key | null | undefined) => <li key={i}>{g}</li>)}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
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
                              handleEditActor(actor);
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
                              if (typeof actor.id === 'number') {
                                handleDeleteActor(actor.id);
                              }
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

      {/* Edit/Create Actor Modal */}
      <ActorEditModal
        actor={editingActor}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingActor(null);
        }}
        onSave={handleSaveActor}
        isSaving={isSaving}
      />
    </div>
  );
};

export default ActorListView;