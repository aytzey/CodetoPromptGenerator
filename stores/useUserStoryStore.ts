// stores/useUserStoryStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UserStory } from '@/types';

interface UserStoryState {
  stories: UserStory[];
  isLoading: boolean;
  isSaving: boolean;
  selectedStoryId: number | null;
  
  // Actions
  setLoading: (flag: boolean) => void;
  setSaving: (flag: boolean) => void;
  setStories: (stories: UserStory[]) => void;
  setSelectedStoryId: (id: number | null) => void;
  
  // Getters
  getStoryById: (id: number) => UserStory | undefined;
  getStoriesForTask: (taskId: number) => UserStory[];
}

export const useUserStoryStore = create<UserStoryState>()(
  devtools(
    immer((set, get) => ({
      stories: [],
      isLoading: false,
      isSaving: false,
      selectedStoryId: null,

      // Actions
      setLoading: (flag) => set({ isLoading: flag }),
      setSaving: (flag) => set({ isSaving: flag }),
      setStories: (stories) => set({ stories }),
      setSelectedStoryId: (id) => set({ selectedStoryId: id }),
      
      // Getters
      getStoryById: (id) => {
        return get().stories.find(s => s.id === id);
      },
      
      getStoriesForTask: (taskId) => {
        return get().stories.filter(s => s.taskIds?.includes(taskId) ?? false);
      },
    }))
  )
);