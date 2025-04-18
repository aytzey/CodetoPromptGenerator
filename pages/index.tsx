// File: pages/index.tsx
// REFACTORED - Significantly smaller
import React from "react";
import Head from "next/head";
import { Loader2, Folder, KeyRound, PlusCircle } from "lucide-react";

// Import the main hook
import { useHomePageLogic } from "@/lib/hooks/useHomePageLogic";

// Import Layout Components
import HeaderView from "@/views/layout/HeaderView";
import WelcomeView from "@/views/layout/WelcomeView";
import MainLayoutView from "@/views/layout/MainLayoutView";

// Import Standalone Views used directly
import FolderPickerView from "@/views/FolderPickerView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  // Get all state and handlers from the custom hook
  const {
    isClient,
    showWelcome,
    projectPath,
    isLoadingTree,
    darkMode,
    isSelecting,
    activeTab,
    filteredTree,
    selectedFilePaths,
    fileSearchTerm,
    hasContent,
    selectedFileCount,
    totalTokens,
    showSettings,
    apiKeyDraft,
    handlePathSelected,
    handleDismissWelcome,
    toggleDark,
    autoSelect,
    setShowSettings,
    saveApiKey,
    setApiKeyDraft,
    setActiveTab,
    setFileSearchTerm,
    handleRefresh,
    handleSelectAll,
    deselectAllFiles,
    setSelectedFilePaths,
    treeRef,
    fileTree, // Pass down to MainLayout -> LeftPanel -> SelectionGroups
  } = useHomePageLogic();

  return (
    <div className="min-h-screen">
      <Head>
        <title>Code → Prompt Generator</title>
        <meta
          name="description"
          content="Generate finely‑tuned LLM prompts straight from your code base."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Use HeaderView Component */}
      <HeaderView
        darkMode={darkMode}
        toggleDark={toggleDark}
        onShowSettings={() => setShowSettings(true)}
        onAutoSelect={autoSelect}
        isSelecting={isSelecting}
        projectPath={projectPath}
      />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10">
        {/* Project Picker - Always Visible */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-3 px-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Folder size={16} className="text-indigo-500" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={handlePathSelected}
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

        {/* Conditional Rendering: Loading, Welcome, or Main Layout */}
        {!isClient ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : showWelcome && !projectPath ? (
          <WelcomeView onDismiss={handleDismissWelcome} />
        ) : (
          <MainLayoutView
            // Pass all necessary props down
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
            fileTree={fileTree} // Pass down for SelectionGroupsView
            hasContent={hasContent}
            selectedFileCount={selectedFileCount}
            totalTokens={totalTokens}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 border-t pt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Code to Prompt Generator © {new Date().getFullYear()} Aytzey
        </footer>
      </main>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-500" />
              OpenRouter Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-1">
            <Label htmlFor="or-key" className="font-medium">
              API Key
            </Label>
            <Input
              id="or-key"
              type="password"
              placeholder="sk-..."
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Stored locally in your browser (never sent to our server).
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={saveApiKey} disabled={!apiKeyDraft.trim()}>
              <PlusCircle size={16} className="mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}