// File: pages/index.tsx
// REFACTORED - Simplified index page, removed WelcomeView logic
import React from "react";
import Head from "next/head";
import { Loader2, Folder, KeyRound, PlusCircle } from "lucide-react";

// Import the main hook
import { useHomePageLogic } from "@/lib/hooks/useHomePageLogic";

// Import Layout Components
import HeaderView from "@/views/layout/HeaderView";
// import WelcomeView from "@/views/layout/WelcomeView"; // Removed
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
    // showWelcome, // Removed
    projectPath,
    isLoadingTree,
    // darkMode, // Removed
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
    // handleDismissWelcome, // Removed
    // toggleDark, // Removed
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
    // The 'dark' class is applied globally in _app.tsx
    <div className="min-h-screen">
      <Head>
        <title>Code → Prompt Generator</title>
        <meta
          name="description"
          content="Generate finely‑tuned LLM prompts straight from your code base."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Use HeaderView Component - Removed darkMode and toggleDark props */}
      <HeaderView
        // darkMode={darkMode} // Removed
        // toggleDark={toggleDark} // Removed
        onShowSettings={() => setShowSettings(true)}
        onAutoSelect={autoSelect}
        isSelecting={isSelecting}
        projectPath={projectPath}
      />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10">
        {/* Project Picker - Always Visible */}
        <Card className="mb-6"> {/* Card component uses dark theme styles via globals.css */}
          <CardHeader className="py-3 px-4 border-b"> {/* Uses dark border from globals.css */}
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Folder size={16} className="text-indigo-400" /> {/* Adjusted color for dark */}
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

        {/* Conditional Rendering: Loading or Main Layout */}
        {!isClient ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          // Always render MainLayoutView if client is ready
          // The view itself can handle the "no project selected" state internally
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
        {/* Removed WelcomeView logic */}

        {/* Footer */}
        <footer className="mt-12 border-t pt-6 text-center text-xs text-gray-400"> {/* Uses dark border/text from globals.css */}
          Code to Prompt Generator © {new Date().getFullYear()} Aytzey
        </footer>
      </main>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        {/* DialogContent relies on dark class from html via globals.css */}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-400" /> {/* Adjusted color for dark */}
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
            <p className="text-xs text-gray-400"> {/* Uses dark text from globals.css */}
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