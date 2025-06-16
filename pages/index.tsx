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

      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10 relative z-10">
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-screen overflow-hidden">
            <div className="absolute top-[15%] left-[5%] w-[45rem] h-[45rem] bg-[rgba(var(--color-primary),0.03)] rounded-full blur-[180px] animate-pulse-slow"></div>
            <div className="absolute bottom-[10%] right-[5%] w-[40rem] h-[40rem] bg-[rgba(var(--color-tertiary),0.03)] rounded-full blur-[180px] animate-pulse-slow" style={{animationDelay: "1s"}}></div>
            <div className="absolute top-[40%] right-[20%] w-[30rem] h-[30rem] bg-[rgba(var(--color-secondary),0.02)] rounded-full blur-[150px] animate-pulse-slow" style={{animationDelay: "2s"}}></div>
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.03]"></div>
          </div>
        </div>

        <Card className="mb-8 overflow-hidden border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-tertiary),0.65)] backdrop-blur-xl shadow-card animate-fade-in glass">
          <CardHeader className="py-3 px-4 border-b border-[rgba(var(--color-border),0.6)] bg-gradient-to-r from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-tertiary),0.9)] glass-header relative">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent-2))]">
              <div className="p-1.5 rounded-md bg-[rgba(var(--color-primary),0.1)] border border-[rgba(var(--color-primary),0.2)]">
                <Folder size={18} className="text-[rgb(var(--color-primary))]" />
              </div>
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 bg-[rgba(var(--color-bg-secondary),0.3)]">
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={handlePathSelected}
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

        {!isClient ? (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-t-2 border-b-2 border-[rgb(var(--color-primary))] animate-spin"></div>
              <div className="w-20 h-20 rounded-full border-l-2 border-r-2 border-[rgb(var(--color-secondary))] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <div className="w-20 h-20 rounded-full border-t-2 border-[rgb(var(--color-tertiary))] animate-spin absolute top-0 left-0" style={{animationDirection: 'alternate', animationDuration: '2s'}}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-[rgba(var(--color-bg-primary),0.8)] backdrop-blur-sm">
                <FileCode size={24} className="text-[rgb(var(--color-accent-2))]" />
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

        <footer className="mt-20 pt-6 border-t border-[rgba(var(--color-border),0.5)] text-center relative">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-primary),0.3)] to-transparent"></div>
          <div className="flex flex-col items-center">
            <div className="text-xs text-[rgb(var(--color-text-muted))] mb-2">
              Code to Prompt Generator © {new Date().getFullYear()} Aytzey
            </div>
            <div className="flex items-center text-xs text-[rgb(var(--color-text-muted))]">
              <Shield size={12} className="mr-1.5 text-[rgb(var(--color-primary))]" />
              <span className="opacity-80">Designed for professional LLM prompt engineering</span>
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