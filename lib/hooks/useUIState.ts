// lib/hooks/useUIState.ts
import { useState, useRef, useMemo } from "react";
import { usePromptStore } from "@/stores/usePromptStore";
import { useAppStore } from "@/stores/useAppStore";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

/**
 * Hook for managing UI-specific state and interactions
 */
export function useUIState() {
  // Local UI state
  const [activeTab, setActiveTab] = useState<"files" | "options" | "tasks">("files");
  
  // Refs
  const treeRef = useRef<FileTreeViewHandle>(null);

  // Store selectors for UI state
  const openSettingsModal = useAppStore((s) => s.openSettingsModal);
  const closeSettingsModal = useAppStore((s) => s.closeSettingsModal);

  // Content state for UI decisions
  const metaPrompt = usePromptStore((s) => s.metaPrompt);
  const mainInstructions = usePromptStore((s) => s.mainInstructions);

  // Derived UI state
  const hasContent = useMemo(
    () => Boolean(metaPrompt.trim() || mainInstructions.trim()),
    [metaPrompt, mainInstructions],
  );

  return {
    // State
    activeTab,
    hasContent,
    treeRef,
    
    // Actions
    setActiveTab,
    openSettingsModal,
    closeSettingsModal,
  };
}
