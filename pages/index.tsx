// File: pages/index.tsx
import React from "react";
import Head from "next/head";
import { Loader2, Folder, KeyRound, PlusCircle, FileCode, Shield } from "lucide-react";

// Import the main hook
import { useHomePageLogic } from "@/lib/hooks/useHomePageLogic";

// Import Layout Components
import HeaderView from "@/views/layout/HeaderView";
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
    showSettings,
    apiKeyDraft,
    handlePathSelected,
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

      {/* Header Component */}
      <HeaderView
        onShowSettings={() => setShowSettings(true)}
        onAutoSelect={autoSelect}
        isSelecting={isSelecting}
        projectPath={projectPath}
      />

      {/* Main Content Area */}
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10">
        {/* Decorative background elements */}
        <div className="fixed -z-10 top-0 right-0 w-full h-screen overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-[40rem] h-[40rem] bg-[rgba(123,147,253,0.03)] rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[35rem] h-[35rem] bg-[rgba(189,147,249,0.03)] rounded-full blur-[150px]"></div>
          <div className="absolute top-[40%] right-[20%] w-[25rem] h-[25rem] bg-[rgba(80,250,123,0.02)] rounded-full blur-[120px]"></div>
        </div>

        {/* Project Picker Card - Enhanced with glassy effect */}
        <Card className="mb-8 overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-fade-in">
          <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(139,233,253)]">
              <Folder size={18} className="text-[rgb(123,147,253)]" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 bg-[rgba(22,23,46,0.5)]">
            <FolderPickerView
              currentPath={projectPath}
              onPathSelected={handlePathSelected}
              isLoading={isLoadingTree}
            />
          </CardContent>
        </Card>

        {/* Conditional Rendering: Loading or Main Layout */}
        {!isClient ? (
          <div className="flex justify-center items-center py-16">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-t-2 border-b-2 border-[rgb(123,147,253)] animate-spin"></div>
              <div className="w-16 h-16 rounded-full border-l-2 border-r-2 border-[rgb(80,250,123)] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <FileCode size={24} className="text-[rgb(224,226,240)] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
        ) : (
          // Always render MainLayoutView if client is ready
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
            fileTree={fileTree}
            hasContent={hasContent}
            selectedFileCount={selectedFileCount}
            totalTokens={totalTokens}
          />
        )}

        {/* Footer with enhanced styling */}
        <footer className="mt-16 pt-6 border-t border-[rgba(60,63,87,0.5)] text-center">
          <div className="flex flex-col items-center">
            <div className="text-xs text-[rgb(140,143,170)] mb-2">
              Code to Prompt Generator © {new Date().getFullYear()} Aytzey
            </div>
            <div className="flex items-center text-xs text-[rgb(140,143,170)]">
              <Shield size={12} className="mr-1 text-[rgb(123,147,253)]" />
              Designed for professional LLM prompt engineering
            </div>
          </div>
        </footer>
      </main>

      {/* Settings Modal with enhanced styling */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.95)] backdrop-blur-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)]">
          <DialogHeader className="border-b border-[rgba(60,63,87,0.7)] pb-3">
            <DialogTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(139,233,253)] to-[rgb(123,147,253)]">
              <KeyRound size={18} className="text-[rgb(139,233,253)]" />
              OpenRouter Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-1 py-3">
            <Label htmlFor="or-key" className="font-medium text-[rgb(190,192,210)]">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="or-key"
                type="password"
                placeholder="sk-..."
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                className="bg-[rgba(15,16,36,0.6)] border-[rgba(60,63,87,0.7)] focus:border-[rgb(123,147,253)] focus:ring-[rgb(123,147,253)] transition-all pl-3 pr-3 py-2"
              />
            </div>
            <p className="text-xs text-[rgb(140,143,170)] italic">
              Your API key is stored locally in your browser and never sent to our server.
            </p>
          </div>
          <DialogFooter className="mt-4 border-t border-[rgba(60,63,87,0.7)] pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
              className="bg-transparent border-[rgba(60,63,87,0.7)] text-[rgb(190,192,210)] hover:bg-[rgba(60,63,87,0.3)] hover:text-[rgb(224,226,240)]"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveApiKey} 
              disabled={!apiKeyDraft.trim()}
              className="bg-gradient-to-r from-[rgb(139,233,253)] to-[rgb(123,147,253)] text-[rgb(15,16,36)] font-medium hover:from-[rgb(123,147,253)] hover:to-[rgb(139,233,253)]"
            >
              <PlusCircle size={16} className="mr-1.5" />
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}