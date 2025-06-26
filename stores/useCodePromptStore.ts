// stores/useCodePromptStore.ts
// -----------------------------------------------------------------------------
// Global store that holds the “Main Instructions / Code-Change Prompt” string.
// Any view (e.g. InstructionsInputView) can subscribe to it and display or
// edit the generated instructions as needed.
// -----------------------------------------------------------------------------

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CodePromptState {
  /** Latest generated code-change prompt. */
  codePrompt: string;
  /** Replace the current prompt. */
  setCodePrompt: (prompt: string) => void;
  /** Clear the prompt (e.g. on project change). */
  clearCodePrompt: () => void;
}

export const useCodePromptStore = create<CodePromptState>()(
  devtools((set) => ({
    codePrompt: '',
    setCodePrompt: (prompt) => set({ codePrompt: prompt }),
    clearCodePrompt: () => set({ codePrompt: '' }),
  })),
);
