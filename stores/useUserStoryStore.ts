// stores/useUserStoryStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { UserStory } from '@/types';

interface UserStoryState {
  /* ----------------------------------------------------------------------- */
  /* Core state                                                              */
  /* ----------------------------------------------------------------------- */
  stories: UserStory[];
  isLoading: boolean;
  isSaving: boolean;

  /* Legacy single-selection (kept for compatibility with other views) */
  selectedStoryId: number | null;

  /* New: multi-selection support */
  selectedStoryIds: number[];

  /* ----------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ----------------------------------------------------------------------- */
  setLoading: (flag: boolean) => void;
  setSaving: (flag: boolean) => void;
  setStories: (stories: UserStory[]) => void;

  /* Legacy setter                                                           */
  setSelectedStoryId: (id: number | null) => void;

  /* Multi-selection helpers                                                 */
  toggleStorySelection: (id: number) => void;
  setSelectedStoryIdsBatch: (ids: number[]) => void; // New: For batch updates
  clearSelectedStories: () => void;

  /* ----------------------------------------------------------------------- */
  /* Getters                                                                 */
  /* ----------------------------------------------------------------------- */
  getStoryById: (id: number) => UserStory | undefined;
  getStoriesForTask: (taskId: number) => UserStory[];
}

export const useUserStoryStore = create<UserStoryState>()(
  devtools(
    immer((set, get) => ({
      /* Core state --------------------------------------------------------- */
      stories: [],
      isLoading: false,
      isSaving: false,

      /* Selection ---------------------------------------------------------- */
      selectedStoryId: null,
      selectedStoryIds: [],

      /* Actions ------------------------------------------------------------ */
      setLoading: (flag) => set({ isLoading: flag }),
      setSaving: (flag) => set({ isSaving: flag }),

      setStories: (stories) =>
        set((state) => {
          state.stories = stories;

          // Keep multi-selection consistent after a reload/delete.
          state.selectedStoryIds = state.selectedStoryIds.filter((id) =>
            stories.some((s) => s.id === id),
          );
        }),

      setSelectedStoryId: (id) => set({ selectedStoryId: id }),

      toggleStorySelection: (id) =>
        set((state) => {
          if (state.selectedStoryIds.includes(id)) {
            state.selectedStoryIds = state.selectedStoryIds.filter((sid) => sid !== id);
          } else {
            state.selectedStoryIds.push(id);
          }
        }),
      
      setSelectedStoryIdsBatch: (ids) => // New: Implementation for batch updates
        set((state) => {
          state.selectedStoryIds = ids;
        }),

      clearSelectedStories: () => set({ selectedStoryIds: [] }),

      /* Getters ------------------------------------------------------------ */
      getStoryById: (id) => get().stories.find((s) => s.id === id),

      getStoriesForTask: (taskId) =>
        get().stories.filter((s) => s.taskIds?.includes(taskId) ?? false),
    })),
  ),
);