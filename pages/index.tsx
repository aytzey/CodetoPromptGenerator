// File: pages/index.tsx
import React from "react";
import Head from "next/head";
import { Loader2, Folder, KeyRound, PlusCircle, FileCode, Shield } from "lucide-react";

// Import the refactored main hook
import { useRefactoredHomePageLogic as useHomePageLogic } from "@/lib/hooks/useRefactoredHomePageLogic";

// Import Layout Components
import HeaderView from "@/views/layout/HeaderView";
import MainLayoutView from "@/views/layout/MainLayoutView";

// Import Modals that are now Zustand-driven for visibility
import SettingsModalView from "@/views/SettingsModalView";
import CodemapPreviewModal from "@/views/CodemapPreviewModal";

// Import Standalone Views used directly
import FolderPickerView from "@/views/FolderPickerView";
// Dialog components are now internal to SettingsModalView & CodemapPreviewModal
// (or other modals if they were to be refactored similarly)
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const {
    isClient,
    projectPath,
    isLoadingTree,
    isSelecting,
    activeTab,
    filteredTree,
    selectedFilePaths,
    fileSearchTerm,
    hasContent,
    selectedFileCount,
    totalTokens,
    // showSettings and setShowSettings are removed
    openSettingsModal, // This is from useHomePageLogic, which gets it from useAppStore
    apiKeyDraft,
    setApiKeyDraft,
    saveApiKey,
    handlePathSelected,
    autoSelect,
    generateActors,
    isGeneratingActors,
    setActiveTab,
    setFileSearchTerm,
    handleRefresh,
    handleSelectAll,
    deselectAllFiles,
    setSelectedFilePaths,
    treeRef,
    fileTree,
  } = useHomePageLogic();

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))]">
      <Head>
        <title>Code → Prompt Generator</title>
        <meta
          name="description"
          content="Generate finely‑tuned LLM prompts straight from your code base."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <HeaderView
        onShowSettings={openSettingsModal} // Pass the action to open settings modal
        onAutoSelect={autoSelect}
        onGenerateActors={generateActors}
        isSelecting={isSelecting}
        isGeneratingActors={isGeneratingActors}
        projectPath={projectPath}
      />

      <main className="container mx-auto px-6 pt-8 pb-12 relative z-10">
        {/* Refined background elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[35rem] h-[35rem] bg-[rgba(var(--color-primary),0.02)] rounded-full blur-[120px] animate-pulse-glow"></div>
          <div className="absolute bottom-[15%] right-[10%] w-[30rem] h-[30rem] bg-[rgba(var(--color-tertiary),0.025)] rounded-full blur-[100px] animate-pulse-glow" style={{animationDelay: "2s"}}></div>
          <div className="absolute top-[50%] right-[25%] w-[25rem] h-[25rem] bg-[rgba(var(--color-secondary),0.015)] rounded-full blur-[80px] animate-pulse-glow" style={{animationDelay: "1s"}}></div>
        </div>

        <Card className="mb-8 glass animate-fade-in">
          <CardHeader className="py-4 px-6 glass-header">
            <CardTitle className="text-lg font-semibold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent-2))]">
              <div className="p-2 rounded-lg bg-[rgba(var(--color-primary),0.1)] border border-[rgba(var(--color-primary),0.2)]">
                <Folder size={18} className="text-[rgb(var(--color-primary))]" />
              </div>
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={handlePathSelected}
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

        {!isClient ? (
          <div className="flex justify-center items-center py-24">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[rgba(var(--color-primary),0.3)] border-t-[rgb(var(--color-primary))] animate-spin"></div>
              <div className="w-16 h-16 rounded-full border-2 border-[rgba(var(--color-secondary),0.2)] border-r-[rgb(var(--color-secondary))] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-[rgba(var(--color-bg-primary),0.9)] backdrop-blur-sm">
                <FileCode size={20} className="text-[rgb(var(--color-accent-2))]" />
              </div>
            </div>
          </div>
        ) : (
          <MainLayoutView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            projectPath={projectPath}
            isLoadingTree={isLoadingTree}
            fileSearchTerm={fileSearchTerm}
            setFileSearchTerm={setFileSearchTerm}
            handleRefresh={handleRefresh}
            handleSelectAll={handleSelectAll}
            deselectAllFiles={deselectAllFiles}
            treeRef={treeRef}
            filteredTree={filteredTree}
            selectedFilePaths={selectedFilePaths}
            setSelectedFilePaths={setSelectedFilePaths}
            fileTree={fileTree}
            hasContent={hasContent}
            selectedFileCount={selectedFileCount}
            totalTokens={totalTokens}
          />
        )}

        <footer className="mt-24 pt-8 border-t border-[rgba(var(--color-border),0.3)] text-center relative">
          <div className="absolute top-0 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-primary),0.4)] to-transparent"></div>
          <div className="flex flex-col items-center space-y-3">
            <div className="text-xs text-[rgb(var(--color-text-muted))] opacity-80">
              Code to Prompt Generator © {new Date().getFullYear()} Aytzey
            </div>
            <div className="flex items-center text-xs text-[rgb(var(--color-text-muted))] opacity-70">
              <Shield size={12} className="mr-2 text-[rgb(var(--color-primary))]" />
              <span>Designed for professional LLM prompt engineering</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Render Modals - They control their own visibility via Zustand */}
      {isClient && (
        <>
          <SettingsModalView
            apiKeyDraft={apiKeyDraft}
            setApiKeyDraft={setApiKeyDraft}
            saveApiKey={saveApiKey}
          />
          <CodemapPreviewModal />
        </>
      )}
    </div>
  );
}