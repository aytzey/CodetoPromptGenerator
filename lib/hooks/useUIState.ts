// lib/hooks/useUIState.ts
import { useState, useRef, useMemo } from "react";
import { usePromptStore } from "@/stores/usePromptStore";
import { useAppStore } from "@/stores/useAppStore";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

export function useUIState() {
  const [activeTab, setActiveTab] = useState<"files" | "options" | "tasks">("files");
  const treeRef = useRef<FileTreeViewHandle>(null);

  const openSettingsModal = useAppStore((s) => s.openSettingsModal);
  const metaPrompt = usePromptStore((s) => s.metaPrompt);
  const mainInstructions = usePromptStore((s) => s.mainInstructions);

  const hasContent = useMemo(
    () => Boolean(metaPrompt.trim() || mainInstructions.trim()),
    [metaPrompt, mainInstructions],
  );

  return {
    activeTab,
    hasContent,
    treeRef,
    setActiveTab,
    openSettingsModal,
  };
}
