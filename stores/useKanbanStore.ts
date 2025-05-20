// FILE: stores/useKanbanStore.ts – FULL FILE (rewritten)
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  KanbanItem,
  KanbanStatus,
  KanbanStatusValues,
} from '@/types';

/* ------------------------------------------------------------------ */
/* Store types                                                         */
/* ------------------------------------------------------------------ */
interface KanbanState {
  items: KanbanItem[];
  isLoading: boolean;
  isSaving: boolean;
  setLoading: (flag: boolean) => void;
  setSaving: (flag: boolean) => void;
  setAll: (items: KanbanItem[]) => void;
  addItem: (item: KanbanItem) => void;
  updateItem: (
    id: number,
    updates: Partial<Omit<KanbanItem, 'id'>>
  ) => void;
  removeItem: (id: number) => void;
  moveItem: (
    id: number,
    toStatus: KanbanStatus,
    toIndex?: number
  ) => void;
}

/* ------------------------------------------------------------------ */
/* Helper – calculate the global insert index for a status + position  */
/* ------------------------------------------------------------------ */
function findGlobalInsertIndex(
  allItems: KanbanItem[],
  status: KanbanStatus,
  localIndex: number | undefined
): number {
  if (localIndex === undefined) return allItems.length; // append to end
  let seen = 0;
  for (let i = 0; i < allItems.length; i++) {
    if (allItems[i].status === status) {
      if (seen === localIndex) return i;
      seen++;
    }
  }
  return allItems.length; // fallback – should not happen
}

/* ------------------------------------------------------------------ */
/* Store implementation                                                */
/* ------------------------------------------------------------------ */
export const useKanbanStore = create<KanbanState>()(
  devtools(
    immer((set) => ({
      items: [],
      isLoading: false,
      isSaving: false,

      /* ---------------- flags ---------------- */
      setLoading: (flag) => set({ isLoading: flag }),
      setSaving: (flag) => set({ isSaving: flag }),

      /* ---------------- collection setters ---- */
      setAll: (items) => set({ items }),
      addItem: (item) =>
        set((state) => {
          state.items.push(item);
        }),
      updateItem: (id, updates) =>
        set((state) => {
          const idx = state.items.findIndex((it) => it.id === id);
          if (idx !== -1) {
            state.items[idx] = { ...state.items[idx], ...updates };
          }
        }),
      removeItem: (id) =>
        set((state) => {
          state.items = state.items.filter((i) => i.id !== id);
        }),

      /* ---------------- drag‑and‑drop move ----- */
      moveItem(id, toStatus, toIndex) {
        set((state) => {
          const fromIdx = state.items.findIndex((i) => i.id === id);
          if (fromIdx === -1) return; // item not found – defensive guard

          // 1️⃣ Detach the item
          const [item] = state.items.splice(fromIdx, 1);
          if (!item) return;

          // 2️⃣ Mutate its status
          item.status = toStatus;

          // 3️⃣ Compute *global* insertion position so Immer splice is easy
          const insertIdx = findGlobalInsertIndex(
            state.items,
            toStatus,
            toIndex
          );

          // 4️⃣ Insert at the calculated position
          state.items.splice(insertIdx, 0, item);
        });
      },
    }))
  )
);
