import React from "react";
import Head from "next/head";
import { Folder, Shield, XCircle } from "lucide-react";
import { useRefactoredHomePageLogic as useHomePageLogic } from "@/lib/hooks/useRefactoredHomePageLogic";
import { useAppStore } from "@/stores/useAppStore";
import HeaderView from "@/views/layout/HeaderView";
import MainLayoutView from "@/views/layout/MainLayoutView";
import SettingsModalView from "@/views/SettingsModalView";
import CodemapPreviewModal from "@/views/CodemapPreviewModal";
import FolderPickerView from "@/views/FolderPickerView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const {
    isClient,
    projectPath,
    isLoadingTree,
    isSelecting,
    activeTab,
    selectedFilePaths,
    fileSearchTerm,
    hasContent,
    selectedFileCount,
    totalTokens,
    openSettingsModal,
    apiKeyDraft,
    setApiKeyDraft,
    saveApiKey,
    handlePathSelected,
    autoSelect,
    setActiveTab,
    setFileSearchTerm,
    handleRefresh,
    handleSelectAll,
    deselectAllFiles,
    setSelectedFilePaths,
    treeRef,
    fileTree,
    rawFileTree,
  } = useHomePageLogic();

  const globalError = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))]">
      <Head>
        <title>Code → Prompt Generator</title>
        <meta
          name="description"
          content="Generate finely-tuned LLM prompts straight from your code base."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <HeaderView
        onShowSettings={openSettingsModal}
        onAutoSelect={autoSelect}
        isSelecting={Boolean(isSelecting)}
        projectPath={projectPath ?? ""}
      />

      {globalError && (
        <div className="container mx-auto px-4 pt-4 md:px-6">
          <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{globalError}</span>
            <button onClick={clearError} className="shrink-0 text-red-400/70 hover:text-red-300 transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        <Card className="mb-6 glass">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Folder size={18} className="text-[rgb(var(--color-primary))]" />
              0. Project Folder
            </CardTitle>
            <p className="text-xs text-[rgb(var(--color-text-muted))]">
              Start here: choose your repository path before selecting files and writing prompts.
            </p>
          </CardHeader>
          <CardContent>
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={handlePathSelected}
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

        {!isClient ? (
          <div className="flex items-center justify-center py-16 text-sm text-[rgb(var(--color-text-muted))]">
            Loading interface...
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
            selectedFilePaths={selectedFilePaths}
            setSelectedFilePaths={setSelectedFilePaths}
            fileTree={fileTree}
            rawFileTree={rawFileTree}
            hasContent={hasContent}
            selectedFileCount={selectedFileCount}
            totalTokens={totalTokens}
          />
        )}

        <footer className="mt-10 border-t border-[rgba(var(--color-border),0.35)] pt-5 text-center">
          <p className="text-xs text-[rgb(var(--color-text-muted))]">
            Code to Prompt Generator © {new Date().getFullYear()} Aytzey
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <Shield size={12} className="text-[rgb(var(--color-primary))]" />
            Built for practical prompt engineering workflows
          </p>
        </footer>
      </main>

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
