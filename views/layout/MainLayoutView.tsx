// File: views/layout/MainLayoutView.tsx
import React from "react";
import LeftPanelView from "./LeftPanelView";
import RightPanelView from "./RightPanelView";
import type { FileNode } from "@/types";
import type { FileTreeViewHandle } from "@/views/FileTreeView";

interface MainLayoutViewProps {
  // Props needed for Left Panel
  activeTab: "files" | "options" | "tasks";
  setActiveTab: (tab: "files" | "options" | "tasks") => void;
  projectPath: string;
  isLoadingTree: boolean;
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
  handleRefresh: () => void;
  handleSelectAll: () => void;
  deselectAllFiles: () => void;
  treeRef: React.RefObject<FileTreeViewHandle | null>;
  filteredTree: FileNode[];
  selectedFilePaths: string[];
  setSelectedFilePaths: (paths: string[]) => void;
  fileTree: FileNode[]; // Needed for SelectionGroupsView

  // Props needed for Right Panel
  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const MainLayoutView: React.FC<MainLayoutViewProps> = (props) => {
  return (
    <div className="animate-fade-in">
      {/* Main content container with enhanced grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
        {/* Enhanced decorative background elements */}
        <div className="absolute -z-10 top-1/4 left-1/4 w-[40rem] h-[40rem] bg-[rgba(var(--color-primary),0.025)] rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute -z-10 bottom-0 right-1/3 w-[35rem] h-[35rem] bg-[rgba(var(--color-tertiary),0.025)] rounded-full blur-[150px] animate-pulse-slow" style={{animationDelay: "1.5s"}}></div>
        <div className="absolute -z-10 top-2/3 left-1/2 w-[25rem] h-[25rem] bg-[rgba(var(--color-secondary),0.02)] rounded-full blur-[120px] animate-pulse-slow" style={{animationDelay: "1s"}}></div>
        
        {/* Left Panel - Takes up 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-8">
          <div className="animate-slide-up" style={{animationDelay: "0.15s"}}>
            <LeftPanelView
              activeTab={props.activeTab}
              setActiveTab={props.setActiveTab}
              projectPath={props.projectPath}
              isLoadingTree={props.isLoadingTree}
              fileSearchTerm={props.fileSearchTerm}
              setFileSearchTerm={props.setFileSearchTerm}
              handleRefresh={props.handleRefresh}
              handleSelectAll={props.handleSelectAll}
              deselectAllFiles={props.deselectAllFiles}
              treeRef={props.treeRef}
              filteredTree={props.filteredTree}
              selectedFilePaths={props.selectedFilePaths}
              setSelectedFilePaths={props.setSelectedFilePaths}
              selectedFileCount={props.selectedFileCount}
              fileTree={props.fileTree}
            />
          </div>
        </div>
        
        {/* Right Panel - Takes up 1 column on large screens */}
        <div className="space-y-8 animate-slide-up" style={{animationDelay: "0.3s"}}>
          <RightPanelView
            hasContent={props.hasContent}
            selectedFileCount={props.selectedFileCount}
            totalTokens={props.totalTokens}
          />
        </div>
      </div>
    </div>
  );
};

export default MainLayoutView;
