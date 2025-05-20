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
      <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10 relative z-10">
        {/* Enhanced decorative background elements */}
        <div className="fixed inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-screen overflow-hidden">
            {/* Primary glow */}
            <div className="absolute top-[15%] left-[5%] w-[45rem] h-[45rem] bg-[rgba(var(--color-primary),0.03)] rounded-full blur-[180px] animate-pulse-slow"></div>
            {/* Secondary glow */}
            <div className="absolute bottom-[10%] right-[5%] w-[40rem] h-[40rem] bg-[rgba(var(--color-tertiary),0.03)] rounded-full blur-[180px] animate-pulse-slow" style={{animationDelay: "1s"}}></div>
            {/* Accent glow */}
            <div className="absolute top-[40%] right-[20%] w-[30rem] h-[30rem] bg-[rgba(var(--color-secondary),0.02)] rounded-full blur-[150px] animate-pulse-slow" style={{animationDelay: "2s"}}></div>
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-[0.03]"></div>
          </div>
        </div>

        {/* Project Picker Card - Enhanced with premium glassy effect */}
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

        {/* Conditional Rendering: Loading or Main Layout */}
        {!isClient ? (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              {/* Composite loading spinner with layered animations */}
              <div className="w-20 h-20 rounded-full border-t-2 border-b-2 border-[rgb(var(--color-primary))] animate-spin"></div>
              <div className="w-20 h-20 rounded-full border-l-2 border-r-2 border-[rgb(var(--color-secondary))] animate-spin absolute top-0 left-0" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              <div className="w-20 h-20 rounded-full border-t-2 border-[rgb(var(--color-tertiary))] animate-spin absolute top-0 left-0" style={{animationDirection: 'alternate', animationDuration: '2s'}}></div>
              {/* Center icon */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-[rgba(var(--color-bg-primary),0.8)] backdrop-blur-sm">
                <FileCode size={24} className="text-[rgb(var(--color-accent-2))]" />
              </div>
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

        {/* Enhanced Footer with subtle divider */}
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

      {/* Settings Modal with premium styling */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md border-[rgba(var(--color-border),0.6)] bg-[rgba(var(--color-bg-tertiary),0.95)] backdrop-blur-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] glass">
          <DialogHeader className="border-b border-[rgba(var(--color-border),0.6)] pb-3 relative">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-tertiary),0.3)] to-transparent"></div>
            <DialogTitle className="flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-accent-2))] to-[rgb(var(--color-primary))]">
              <div className="p-1.5 rounded-md bg-[rgba(var(--color-accent-2),0.1)] border border-[rgba(var(--color-accent-2),0.2)]">
                <KeyRound size={18} className="text-[rgb(var(--color-accent-2))]" />
              </div>
              OpenRouter Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-1 py-4">
            <Label htmlFor="or-key" className="font-medium text-[rgb(var(--color-text-secondary))]">
              API Key
            </Label>
            <div className="relative group">
              <Input
                id="or-key"
                type="password"
                placeholder="sk-..."
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                className="bg-[rgba(var(--color-bg-secondary),0.6)] border-[rgba(var(--color-border),0.7)] focus:border-[rgb(var(--color-primary))] focus:ring-[rgb(var(--color-primary))] focus-within:shadow-glow-primary transition-all pl-3 pr-3 py-2"
              />
              <div className="absolute inset-0 rounded-md border border-[rgba(var(--color-primary),0.2)] opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity shadow-[0_0_8px_rgba(var(--color-primary),0.1)]"></div>
            </div>
            <p className="text-xs text-[rgb(var(--color-text-muted))] italic">
              Your API key is stored locally in your browser and never sent to our server.
            </p>
          </div>
          <DialogFooter className="mt-4 border-t border-[rgba(var(--color-border),0.6)] pt-4 relative">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[rgba(var(--color-tertiary),0.3)] to-transparent"></div>
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
              className="bg-transparent border-[rgba(var(--color-border),0.7)] text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-border),0.15)] hover:text-[rgb(var(--color-text-primary))] transition-all"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveApiKey} 
              disabled={!apiKeyDraft.trim()}
              className="relative overflow-hidden bg-gradient-to-r from-[rgb(var(--color-accent-2))] to-[rgb(var(--color-primary))] text-[rgb(var(--color-bg-primary))] font-medium shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_20px_rgba(var(--color-primary),0.5)] hover:from-[rgb(var(--color-primary))] hover:to-[rgb(var(--color-accent-2))] transition-all active:scale-95"
            >
              <div className="relative z-10 flex items-center">
                <PlusCircle size={16} className="mr-1.5" />
                Save Key
              </div>
              <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_2s_infinite]"></div>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}