// stores/useActorStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Actor } from '@/types';

interface ActorState {
  actors: Actor[];
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  setLoading: (flag: boolean) => void;
  setSaving: (flag: boolean) => void;
  setActors: (actors: Actor[]) => void;
  
  // Optimistic updates for better UX
  addActorOptimistic: (actor: Actor) => void;
  updateActorOptimistic: (id: number, updates: Partial<Actor>) => void;
  removeActorOptimistic: (id: number) => void;
  
  // Getters
  getActorById: (id: number) => Actor | undefined;
}

export const useActorStore = create<ActorState>()(
  devtools(
    immer((set, get) => ({
      actors: [],
      isLoading: false,
      isSaving: false,

      // Actions
      setLoading: (flag) => set({ isLoading: flag }),
      setSaving: (flag) => set({ isSaving: flag }),
      setActors: (actors) => set({ actors }),
      
      // Optimistic updates
      addActorOptimistic: (actor) => set((state) => {
        state.actors.push(actor);
      }),
      updateActorOptimistic: (id, updates) => set((state) => {
        const index = state.actors.findIndex(a => a.id === id);
        if (index !== -1) {
          state.actors[index] = { ...state.actors[index], ...updates };
        }
      }),
      removeActorOptimistic: (id) => set((state) => {
        state.actors = state.actors.filter(a => a.id !== id);
      }),
      
      // Getters
      getActorById: (id) => {
        return get().actors.find(a => a.id === id);
      },
    }))
  )
);